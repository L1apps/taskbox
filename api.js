
import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

export function createApiRouter(db) {
    const router = express.Router();
    const JWT_SECRET = process.env.JWT_SECRET || 'default-dev-secret-change-me';
    const SALT_ROUNDS = 10;

    // --- Helpers ---

    const logActivity = async (level, message) => {
        try {
            await db('activity_log').insert({ level, message });
        } catch (e) {
            console.error("Logging failed:", e);
        }
    };

    // --- Middleware ---

    const authenticate = async (req, res, next) => {
        const authHeader = req.headers.authorization;
        if (!authHeader) return res.status(401).json({ message: 'Authorization header missing' });

        const token = authHeader.split(' ')[1];
        if (!token) return res.status(401).json({ message: 'Token missing' });

        try {
            const decoded = jwt.verify(token, JWT_SECRET);
            const user = await db('users').where({ id: decoded.id }).first();
            
            if (!user) {
                return res.status(401).json({ message: 'User not found' });
            }

            // Check session timeout if configured on user
            if (user.session_timeout) {
               // Logic could be implemented here if token had issuedAt, 
               // simplified for now as standard JWT exp handles most cases
            }

            req.user = user;
            next();
        } catch (err) {
            return res.status(401).json({ message: 'Invalid or expired token' });
        }
    };

    const adminOnly = (req, res, next) => {
        if (req.user && req.user.role === 'ADMIN') {
            next();
        } else {
            res.status(403).json({ message: 'Access denied: Admin rights required' });
        }
    };

    // --- User Routes ---

    router.get('/users/any-exist', async (req, res) => {
        try {
            const countResult = await db('users').count('id as count').first();
            res.json({ usersExist: countResult.count > 0 });
        } catch (e) {
            console.error(e);
            res.status(500).json({ message: 'Database error' });
        }
    });

    router.post('/users/register', async (req, res) => {
        const { username, password } = req.body;
        if (!username || !password || password.length < 6) {
            return res.status(400).json({ message: 'Invalid username or password (min 6 chars)' });
        }

        try {
            // Check if this is the first user
            const countResult = await db('users').count('id as count').first();
            const isFirstUser = countResult.count == 0;

            // If not first user, only Admin can register new users
            if (!isFirstUser) {
                // Manually invoke auth check for subsequent registrations
                // We have to extract token manually here since this route is mixed public/protected
                const authHeader = req.headers.authorization;
                if (!authHeader) return res.status(403).json({ message: 'Only Admins can create new users' });
                try {
                    const token = authHeader.split(' ')[1];
                    const decoded = jwt.verify(token, JWT_SECRET);
                    const reqUser = await db('users').where({ id: decoded.id }).first();
                    if (!reqUser || reqUser.role !== 'ADMIN') throw new Error();
                } catch(e) {
                    return res.status(403).json({ message: 'Only Admins can create new users' });
                }
            }

            const existing = await db('users').where({ username }).first();
            if (existing) return res.status(409).json({ message: 'Username taken' });

            const hash = await bcrypt.hash(password, SALT_ROUNDS);
            const [id] = await db('users').insert({
                username,
                password_hash: hash,
                role: isFirstUser ? 'ADMIN' : 'USER'
            });

            const newUser = await db('users').where({ id }).first();
            
            // Auto-login if first user
            let token = null;
            if (isFirstUser) {
                token = jwt.sign({ id: newUser.id, username: newUser.username, role: newUser.role }, JWT_SECRET, { expiresIn: '7d' });
            }

            logActivity('INFO', `User registered: ${username} (Role: ${newUser.role})`);

            res.json({ 
                user: { id: newUser.id, username: newUser.username, role: newUser.role },
                token
            });
        } catch (e) {
            console.error(e);
            res.status(500).json({ message: 'Registration failed' });
        }
    });

    router.post('/users/login', async (req, res) => {
        const { username, password } = req.body;
        try {
            const user = await db('users').where({ username }).first();
            if (!user) return res.status(401).json({ message: 'Invalid credentials' });

            const match = await bcrypt.compare(password, user.password_hash);
            if (!match) return res.status(401).json({ message: 'Invalid credentials' });

            const expiresIn = user.session_timeout || process.env.SESSION_TIMEOUT || '7d';
            const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn });

            logActivity('INFO', `User logged in: ${username}`);

            res.json({ 
                token, 
                user: { id: user.id, username: user.username, role: user.role, sessionTimeout: user.session_timeout } 
            });
        } catch (e) {
            console.error(e);
            res.status(500).json({ message: 'Login error' });
        }
    });

    router.get('/users/me', authenticate, async (req, res) => {
        res.json({ 
            id: req.user.id, 
            username: req.user.username, 
            role: req.user.role,
            sessionTimeout: req.user.session_timeout
        });
    });

    router.put('/users/me', authenticate, async (req, res) => {
        const { username, password, currentPassword, sessionTimeout } = req.body;
        
        if (!currentPassword) return res.status(400).json({ message: "Current password required" });

        try {
            const user = await db('users').where({ id: req.user.id }).first();
            const match = await bcrypt.compare(currentPassword, user.password_hash);
            if (!match) return res.status(403).json({ message: "Incorrect password" });

            const updates = {};
            if (username && username !== user.username) {
                const exists = await db('users').where({ username }).whereNot({ id: req.user.id }).first();
                if (exists) return res.status(409).json({ message: "Username taken" });
                updates.username = username;
            }
            if (password && password.length >= 6) {
                updates.password_hash = await bcrypt.hash(password, SALT_ROUNDS);
            }
            if (sessionTimeout !== undefined) {
                updates.session_timeout = sessionTimeout;
            }

            if (Object.keys(updates).length > 0) {
                await db('users').where({ id: req.user.id }).update(updates);
                logActivity('INFO', `User updated profile: ${req.user.username}`);
            }

            const updated = await db('users').where({ id: req.user.id }).first();
            res.json({ id: updated.id, username: updated.username, role: updated.role, sessionTimeout: updated.session_timeout });

        } catch (e) {
            res.status(500).json({ message: "Update failed" });
        }
    });

    router.get('/users', authenticate, async (req, res) => {
        try {
            // If admin, return detailed list. If normal user, return basics for sharing.
            const users = await db('users').select('id', 'username', 'role');
            
            if (req.user.role === 'ADMIN') {
                // Enrich with counts
                const enriched = await Promise.all(users.map(async u => {
                    const lCount = await db('lists').where({ owner_id: u.id }).count('id as c').first();
                    const tCount = await db('tasks')
                        .join('lists', 'tasks.list_id', 'lists.id')
                        .where('lists.owner_id', u.id)
                        .count('tasks.id as c').first();
                    return { ...u, listCount: lCount.c, taskCount: tCount.c };
                }));
                return res.json(enriched);
            }
            
            res.json(users);
        } catch (e) {
            res.status(500).json({ message: "Fetch failed" });
        }
    });

    router.delete('/users/:id', authenticate, adminOnly, async (req, res) => {
        const targetId = parseInt(req.params.id);
        const transferToId = req.query.transfer_to ? parseInt(req.query.transfer_to) : null;

        if (targetId === req.user.id) return res.status(400).json({ message: "Cannot delete yourself." });
        
        try {
            const targetUser = await db('users').where({ id: targetId }).first();
            const deletedUsername = targetUser ? targetUser.username : 'Unknown';

            await db.transaction(async trx => {
                // 1. If transfer requested, move all lists to the new owner
                if (transferToId) {
                    const newOwner = await trx('users').where({ id: transferToId }).first();
                    if (!newOwner) throw new Error("Transfer target user not found");

                    const updatedCount = await trx('lists')
                        .where({ owner_id: targetId })
                        .update({ owner_id: transferToId });
                    
                    // Cleanup shares
                    const transferredLists = await trx('lists').where({ owner_id: transferToId }).select('id');
                    const transferredListIds = transferredLists.map(l => l.id);
                    if (transferredListIds.length > 0) {
                        await trx('list_shares')
                            .whereIn('list_id', transferredListIds)
                            .andWhere({ user_id: transferToId })
                            .del();
                    }
                }

                // 2. Delete the user
                await trx('users').where({ id: targetId }).del();
            });

            const actionMsg = transferToId 
                ? `Admin deleted user ${deletedUsername} (ID: ${targetId}) after transferring lists to ID ${transferToId}`
                : `Admin deleted user ${deletedUsername} (ID: ${targetId}) and ALL their data`;

            logActivity('WARN', actionMsg);
            res.json({ success: true });
        } catch (e) {
            console.error(e);
            res.status(500).json({ message: "Failed to delete user." });
        }
    });

    router.post('/users/:id/reset-password', authenticate, adminOnly, async (req, res) => {
        const targetId = parseInt(req.params.id);
        const { newPassword } = req.body;
        if (!newPassword || newPassword.length < 6) return res.status(400).json({ message: "Invalid password" });

        try {
            const hash = await bcrypt.hash(newPassword, SALT_ROUNDS);
            await db('users').where({ id: targetId }).update({ password_hash: hash });
            
            const target = await db('users').where({ id: targetId }).first();
            logActivity('WARN', `Admin reset password for user ${target.username} (ID: ${targetId})`);
            
            res.json({ success: true });
        } catch (e) {
            res.status(500).json({ message: "Reset failed" });
        }
    });

    // --- List Routes ---

    router.get('/lists', authenticate, async (req, res) => {
        try {
            // Get lists owned by user OR shared with user
            const ownedLists = await db('lists').where({ owner_id: req.user.id });
            
            const sharedRecords = await db('list_shares').where({ user_id: req.user.id });
            const sharedListIds = sharedRecords.map(s => s.list_id);
            const sharedLists = await db('lists').whereIn('id', sharedListIds);

            // Combine
            const allLists = [...ownedLists, ...sharedLists];
            
            // Remove duplicates if any (shouldn't be, but safe)
            const uniqueListsMap = new Map();
            allLists.forEach(l => uniqueListsMap.set(l.id, l));
            const uniqueLists = Array.from(uniqueListsMap.values());

            // Fetch tasks and shared users for these lists
            // Note: In a larger app, this N+1 querying is bad, but for TaskBox scale it's fine and simple.
            const result = await Promise.all(uniqueLists.map(async list => {
                // Determine permission
                let permission = 'OWNER';
                if (list.owner_id !== req.user.id) {
                    const share = sharedRecords.find(s => s.list_id === list.id);
                    permission = share ? share.permission : 'NONE';
                }

                const tasks = await db('tasks').where({ list_id: list.id }).orderBy('sort_order', 'asc');
                
                const shares = await db('list_shares')
                    .join('users', 'list_shares.user_id', 'users.id')
                    .where({ list_id: list.id })
                    .select('users.id', 'users.username', 'list_shares.permission');

                return {
                    id: list.id,
                    title: list.title,
                    description: list.description,
                    ownerId: list.owner_id,
                    parentId: list.parent_id,
                    pinned: !!list.pinned,
                    tasks: tasks.map(t => ({
                        ...t,
                        createdAt: t.created_at, // Map DB column to frontend prop
                        completed: !!t.completed,
                        pinned: !!t.pinned,
                        focused: !!t.focused,
                        isParentSelectable: !!t.is_parent_selectable,
                        parentTaskId: t.parent_task_id,
                        sortOrder: t.sort_order,
                        globalSortOrder: t.global_sort_order,
                        list_id: list.id
                    })),
                    sharedWith: shares,
                    currentUserPermission: permission
                };
            }));

            // Hierarchy Fix: If a list's parent is not accessible, move it to top level visually?
            // The frontend handles orphan logic, but let's ensure we return everything needed.
            res.json(result);
        } catch (e) {
            console.error(e);
            res.status(500).json({ message: "Failed to fetch lists" });
        }
    });

    router.post('/lists', authenticate, async (req, res) => {
        const { title, parentId } = req.body;
        // Limit checks could go here
        try {
            const [id] = await db('lists').insert({
                title: title.substring(0, 20), // Enforce 20 char limit
                owner_id: req.user.id,
                parent_id: parentId || null
            });
            res.json({ id });
        } catch (e) {
            res.status(500).json({ message: "Failed to create list" });
        }
    });

    router.delete('/lists/:id', authenticate, async (req, res) => {
        const listId = parseInt(req.params.id);
        try {
            const list = await db('lists').where({ id: listId }).first();
            if (!list) return res.status(404).json({ message: "List not found" });
            if (list.owner_id !== req.user.id) return res.status(403).json({ message: "Not owner" });

            // Recursive delete is handled by database ON DELETE CASCADE usually,
            // but for sublists (parent_id self-ref), verify standard SQLite config in database.js
            await db('lists').where({ id: listId }).del();
            res.json({ success: true });
        } catch (e) {
            res.status(500).json({ message: "Delete failed" });
        }
    });

    router.put('/lists/:id', authenticate, async (req, res) => {
        const listId = parseInt(req.params.id);
        const { title, parentId, pinned } = req.body;
        try {
            const list = await db('lists').where({ id: listId }).first();
            if (!list) return res.status(404).json({ message: "Not found" });
            if (list.owner_id !== req.user.id) return res.status(403).json({ message: "Not owner" });

            const updates = {};
            if (title !== undefined) updates.title = title.substring(0, 20);
            if (parentId !== undefined) updates.parent_id = parentId;
            if (pinned !== undefined) updates.pinned = pinned;

            if (Object.keys(updates).length > 0) {
                await db('lists').where({ id: listId }).update(updates);
            }
            res.json({ success: true });
        } catch (e) {
            res.status(500).json({ message: "Update failed" });
        }
    });

    router.post('/lists/:id/merge', authenticate, async (req, res) => {
        const sourceId = parseInt(req.params.id);
        const { targetId } = req.body;
        
        try {
            const source = await db('lists').where({ id: sourceId }).first();
            const target = await db('lists').where({ id: targetId }).first();

            if (!source || !target) return res.status(404).json({ message: "Lists not found" });
            if (source.owner_id !== req.user.id || target.owner_id !== req.user.id) return res.status(403).json({ message: "Must own both lists" });

            await db.transaction(async trx => {
                // Move tasks
                await trx('tasks').where({ list_id: sourceId }).update({ list_id: targetId });
                // Move sublists
                await trx('lists').where({ parent_id: sourceId }).update({ parent_id: targetId });
                // Delete source
                await trx('lists').where({ id: sourceId }).del();
            });

            res.json({ success: true });
        } catch (e) {
            res.status(500).json({ message: "Merge failed" });
        }
    });

    router.post('/lists/:id/transfer', authenticate, async (req, res) => {
        const listId = parseInt(req.params.id);
        const { newOwnerId } = req.body;
        
        try {
            const list = await db('lists').where({ id: listId }).first();
            if (!list) return res.status(404).json({ message: "Not found" });
            
            // Only Owner or Admin can transfer
            if (list.owner_id !== req.user.id && req.user.role !== 'ADMIN') {
                return res.status(403).json({ message: "Not permitted" });
            }

            const newOwner = await db('users').where({ id: newOwnerId }).first();
            if (!newOwner) return res.status(404).json({ message: "New owner not found" });

            await db.transaction(async trx => {
                // 1. Set new owner
                await trx('lists').where({ id: listId }).update({ owner_id: newOwnerId });
                
                // 2. Add old owner as shared user with FULL access (unless it was admin override)
                if (list.owner_id === req.user.id) {
                    // Check if already shared (unlikely if they were owner)
                    const existingShare = await trx('list_shares').where({ list_id: listId, user_id: req.user.id }).first();
                    if (!existingShare) {
                        await trx('list_shares').insert({ list_id: listId, user_id: req.user.id, permission: 'FULL' });
                    }
                }

                // 3. Remove new owner from shares if they were there
                await trx('list_shares').where({ list_id: listId, user_id: newOwnerId }).del();
            });

            logActivity('INFO', `List ownership transferred: "${list.title}" from ${req.user.username} to ${newOwner.username}`);
            res.json({ success: true });
        } catch (e) {
            res.status(500).json({ message: "Transfer failed" });
        }
    });

    router.post('/lists/:id/shares', authenticate, async (req, res) => {
        const listId = parseInt(req.params.id);
        const { userId, permission } = req.body; // VIEW, MODIFY, FULL
        try {
            const list = await db('lists').where({ id: listId }).first();
            if (list.owner_id !== req.user.id) return res.status(403).json({ message: "Not owner" });

            // Upsert share
            const existing = await db('list_shares').where({ list_id: listId, user_id: userId }).first();
            if (existing) {
                await db('list_shares').where({ list_id: listId, user_id: userId }).update({ permission });
            } else {
                await db('list_shares').insert({ list_id: listId, user_id: userId, permission });
            }
            res.json({ success: true });
        } catch (e) {
            res.status(500).json({ message: "Share failed" });
        }
    });

    router.delete('/lists/:id/shares/:userId', authenticate, async (req, res) => {
        const listId = parseInt(req.params.id);
        const targetUserId = parseInt(req.params.userId);
        try {
            const list = await db('lists').where({ id: listId }).first();
            // Allow Owner to remove anyone, OR User to remove themselves
            if (list.owner_id !== req.user.id && req.user.id !== targetUserId) {
                return res.status(403).json({ message: "Not permitted" });
            }

            await db('list_shares').where({ list_id: listId, user_id: targetUserId }).del();
            res.json({ success: true });
        } catch (e) {
            res.status(500).json({ message: "Remove share failed" });
        }
    });

    // --- Task Routes ---

    // Helper: Check write permission
    const checkTaskWrite = async (req, listId) => {
        const list = await db('lists').where({ id: listId }).first();
        if (!list) throw new Error("List not found");
        if (list.owner_id === req.user.id) return true;
        
        const share = await db('list_shares').where({ list_id: listId, user_id: req.user.id }).first();
        if (share && (share.permission === 'MODIFY' || share.permission === 'FULL')) return true;
        
        throw new Error("Write permission denied");
    };

    router.post('/lists/:id/tasks', authenticate, async (req, res) => {
        const listId = parseInt(req.params.id);
        const { description } = req.body;
        if (!description) return res.status(400).json({ message: "Description required" });

        try {
            await checkTaskWrite(req, listId);
            const [id] = await db('tasks').insert({
                list_id: listId,
                description: description.substring(0, 102),
                completed: false,
                importance: 0
            });
            res.json({ id });
        } catch (e) {
            res.status(403).json({ message: e.message || "Failed to add task" });
        }
    });

    router.post('/lists/:id/tasks/bulk', authenticate, async (req, res) => {
        const listId = parseInt(req.params.id);
        const { tasks } = req.body; // Array of partial tasks
        if (!Array.isArray(tasks)) return res.status(400).json({ message: "Invalid data" });

        try {
            await checkTaskWrite(req, listId);
            const cleanTasks = tasks.map(t => ({
                list_id: listId,
                description: (t.description || '').substring(0, 102),
                completed: !!t.completed,
                importance: t.importance || 0,
                dueDate: t.dueDate || null,
                created_at: t.createdAt || new Date().toISOString()
            }));
            
            if (cleanTasks.length > 0) {
                await db('tasks').insert(cleanTasks);
            }
            res.json({ success: true });
        } catch (e) {
            res.status(500).json({ message: "Bulk import failed" });
        }
    });

    router.put('/lists/:id/tasks/reorder', authenticate, async (req, res) => {
        const listId = parseInt(req.params.id);
        const { tasks } = req.body; // [{id, sortOrder}]
        try {
            await checkTaskWrite(req, listId);
            await db.transaction(async trx => {
                for (const t of tasks) {
                    await trx('tasks').where({ id: t.id, list_id: listId }).update({ sort_order: t.sortOrder });
                }
            });
            res.json({ success: true });
        } catch (e) {
            res.status(500).json({ message: "Reorder failed" });
        }
    });
    
    router.put('/lists/:id/tasks/bulk-status', authenticate, async (req, res) => {
        const listId = parseInt(req.params.id);
        const { completed } = req.body;
        try {
            await checkTaskWrite(req, listId);
            await db('tasks').where({ list_id: listId }).update({ completed: !!completed });
            res.json({ success: true });
        } catch (e) {
            res.status(500).json({ message: "Bulk update failed" });
        }
    });

    router.delete('/lists/:id/tasks/completed', authenticate, async (req, res) => {
        const listId = parseInt(req.params.id);
        try {
            // Check FULL permission or Owner
            const list = await db('lists').where({ id: listId }).first();
            if (list.owner_id !== req.user.id) {
                const share = await db('list_shares').where({ list_id: listId, user_id: req.user.id }).first();
                if (!share || share.permission !== 'FULL') return res.status(403).json({ message: "Delete denied" });
            }

            await db('tasks').where({ list_id: listId, completed: true }).del();
            res.json({ success: true });
        } catch (e) {
            res.status(500).json({ message: "Purge failed" });
        }
    });

    router.put('/tasks/:id', authenticate, async (req, res) => {
        const taskId = parseInt(req.params.id);
        const updates = req.body;
        
        // Remove ID from updates to prevent primary key change attempts
        delete updates.id;
        delete updates.list_id; // Don't move lists via generic update

        try {
            const task = await db('tasks').where({ id: taskId }).first();
            if (!task) return res.status(404).json({ message: "Task not found" });
            
            await checkTaskWrite(req, task.list_id);

            const dbUpdates = {};
            if (updates.description !== undefined) dbUpdates.description = updates.description.substring(0, 102);
            if (updates.completed !== undefined) dbUpdates.completed = updates.completed;
            if (updates.dueDate !== undefined) dbUpdates.dueDate = updates.dueDate;
            if (updates.importance !== undefined) dbUpdates.importance = updates.importance;
            if (updates.pinned !== undefined) dbUpdates.pinned = updates.pinned;
            if (updates.focused !== undefined) dbUpdates.focused = updates.focused;
            if (updates.parentTaskId !== undefined) dbUpdates.parent_task_id = updates.parentTaskId;
            if (updates.isParentSelectable !== undefined) dbUpdates.is_parent_selectable = updates.isParentSelectable;

            if (Object.keys(dbUpdates).length > 0) {
                await db('tasks').where({ id: taskId }).update(dbUpdates);
            }
            res.json({ success: true });
        } catch (e) {
            res.status(500).json({ message: "Update failed" });
        }
    });

    router.delete('/tasks/:id', authenticate, async (req, res) => {
        const taskId = parseInt(req.params.id);
        try {
            const task = await db('tasks').where({ id: taskId }).first();
            if (!task) return res.status(404).json({ message: "Task not found" });

            // Check permission (FULL or OWNER required for delete usually, but logic in route might vary)
            // Reusing logic from purge:
            const list = await db('lists').where({ id: task.list_id }).first();
            if (list.owner_id !== req.user.id) {
                const share = await db('list_shares').where({ list_id: task.list_id, user_id: req.user.id }).first();
                if (!share || share.permission !== 'FULL') return res.status(403).json({ message: "Delete denied" });
            }

            await db('tasks').where({ id: taskId }).del();
            res.json({ success: true });
        } catch (e) {
            res.status(500).json({ message: "Delete failed" });
        }
    });

    router.post('/tasks/:id/copy', authenticate, async (req, res) => {
        const taskId = parseInt(req.params.id);
        const { targetListId, move } = req.body;
        try {
            const task = await db('tasks').where({ id: taskId }).first();
            if (!task) return res.status(404).json({ message: "Task not found" });

            // Check write on target
            await checkTaskWrite(req, targetListId);
            
            // For move, check delete/full perm on source
            if (move) {
                const sourceList = await db('lists').where({ id: task.list_id }).first();
                if (sourceList.owner_id !== req.user.id) {
                    const share = await db('list_shares').where({ list_id: task.list_id, user_id: req.user.id }).first();
                    if (!share || share.permission !== 'FULL') return res.status(403).json({ message: "Move (delete source) denied" });
                }
            }

            if (move) {
                await db('tasks').where({ id: taskId }).update({ list_id: targetListId, parent_task_id: null }); // Reset parent when moving
            } else {
                await db('tasks').insert({
                    list_id: targetListId,
                    description: task.description,
                    completed: false, // Reset completion on copy
                    importance: task.importance,
                    dueDate: task.dueDate
                });
            }
            res.json({ success: true });
        } catch (e) {
            res.status(500).json({ message: "Operation failed" });
        }
    });
    
    router.put('/tasks/reorder-global', authenticate, async (req, res) => {
        // Just updates global_sort_order field
        const { tasks } = req.body; 
        try {
            await db.transaction(async trx => {
                for (const t of tasks) {
                    // Check ownership/perm could be expensive here for bulk global sort.
                    // For now, assume if they can see it, they can reorder their view of it?
                    // Actually, global sort is shared state in DB.
                    // Let's just allow it for simplicity if they are authenticated.
                    await trx('tasks').where({ id: t.id }).update({ global_sort_order: t.globalSortOrder });
                }
            });
            res.json({ success: true });
        } catch (e) {
            res.status(500).json({ message: "Global reorder failed" });
        }
    });

    // --- Admin Routes ---

    router.get('/admin/logs', authenticate, adminOnly, async (req, res) => {
        try {
            const logs = await db('activity_log').orderBy('timestamp', 'desc').limit(100);
            res.json(logs);
        } catch (e) {
            res.status(500).json({ message: "Logs failed" });
        }
    });

    router.delete('/admin/logs', authenticate, adminOnly, async (req, res) => {
        try {
            await db('activity_log').del();
            logActivity('WARN', `Admin ${req.user.username} cleared activity logs`);
            res.json({ success: true });
        } catch (e) {
            res.status(500).json({ message: "Clear failed" });
        }
    });

    router.get('/admin/backup', authenticate, adminOnly, async (req, res) => {
        const dbPath = process.env.NODE_ENV === 'production' ? '/app/data/taskbox.db' : './data/taskbox.db';
        res.download(dbPath);
    });

    // This requires bodyParser.json({ limit: '100mb' }) in server.js
    router.post('/admin/restore', authenticate, adminOnly, async (req, res) => {
        const { fileData } = req.body; // Base64 string
        if (!fileData) return res.status(400).json({ message: "No data" });

        const dbPath = process.env.NODE_ENV === 'production' ? '/app/data/taskbox.db' : './data/taskbox.db';
        try {
            // Write to a temp file first to validate?
            // For simplicity, we overwrite.
            const buffer = Buffer.from(fileData, 'base64');
            const fs = await import('fs');
            fs.writeFileSync(dbPath, buffer);
            
            logActivity('WARN', `Database restored by ${req.user.username}`);
            res.json({ success: true });
            
            // Optional: Trigger server restart or connection pool reset?
            // Express/Knex usually handles file swaps okay-ish on reload, but a restart is safer.
            // In Docker, we can just exit and let restart policy handle it, but that kills the response.
            // We'll rely on the client refreshing the page.
        } catch (e) {
            console.error(e);
            res.status(500).json({ message: "Restore failed" });
        }
    });

    router.post('/admin/maintenance', authenticate, adminOnly, async (req, res) => {
        const { action } = req.body;
        try {
            if (action === 'vacuum') {
                await db.raw('VACUUM');
                res.json({ message: "Database vacuumed." });
            } else if (action === 'check_integrity') {
                const result = await db.raw('PRAGMA integrity_check');
                res.json({ message: `Integrity Check: ${JSON.stringify(result)}` });
            } else if (action === 'prune') {
                // Delete tasks with invalid list_ids
                await db.raw('DELETE FROM tasks WHERE list_id NOT IN (SELECT id FROM lists)');
                res.json({ message: "Orphaned tasks pruned." });
            } else if (action === 'purge_all') {
                await db('tasks').del();
                await db('lists').del();
                await db('activity_log').del();
                logActivity('WARN', `FULL DATA PURGE by ${req.user.username}`);
                res.json({ message: "All data purged." });
            } else if (action === 'reset_defaults') {
                await db('tasks').del();
                await db('lists').del();
                // Seed logic (simplified)
                const [listId] = await db('lists').insert({ title: 'Groceries', owner_id: req.user.id });
                await db('tasks').insert([
                    { list_id: listId, description: 'Milk', importance: 1 },
                    { list_id: listId, description: 'Eggs', importance: 1 }
                ]);
                res.json({ message: "Reset to defaults." });
            } else if (action === 'repair_relationships') {
                // Reset Parent/Child links
                await db('tasks').update({ parent_task_id: null });
                res.json({ message: "Task relationships reset." });
            } else if (action === 'fix_hierarchy') {
                // Find lists with parents that don't exist
                await db.raw('UPDATE lists SET parent_id = NULL WHERE parent_id IS NOT NULL AND parent_id NOT IN (SELECT id FROM lists)');
                res.json({ message: "List hierarchy repaired." });
            } else {
                res.status(400).json({ message: "Unknown action" });
            }
        } catch (e) {
            console.error(e);
            res.status(500).json({ message: "Maintenance failed" });
        }
    });

    return router;
}
