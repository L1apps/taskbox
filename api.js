
import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import fs from 'fs';
import path from 'path';
import knex from 'knex';

const SALT_ROUNDS = 10;
const JWT_SECRET = process.env.JWT_SECRET || 'default-dev-secret';

// --- Helper Middlewares ---

const authenticate = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ message: 'No token provided' });

    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded; // { id, username, role }
        next();
    } catch (err) {
        return res.status(401).json({ message: 'Invalid token' });
    }
};

const adminOnly = (req, res, next) => {
    if (req.user && req.user.role === 'ADMIN') {
        next();
    } else {
        res.status(403).json({ message: 'Admin access required' });
    }
};

const logActivity = async (db, level, message) => {
    try {
        await db('activity_log').insert({ level, message });
    } catch (e) {
        console.error('Failed to log activity:', e);
    }
};

// Helper: Recursively get all descendant list IDs including the root
async function getFamilyTreeIds(db, rootId) {
    let ids = [rootId];
    const children = await db('lists').where({ parent_id: rootId }).select('id');
    for (const child of children) {
        const descendantIds = await getFamilyTreeIds(db, child.id);
        ids = ids.concat(descendantIds);
    }
    return ids;
}

// --- API Router Factory ---

export function createApiRouter(db) {
    const router = express.Router();

    // --- User Routes ---

    router.get('/users/any-exist', async (req, res) => {
        const count = await db('users').count('id as count').first();
        res.json({ usersExist: count.count > 0 });
    });

    router.post('/users/register', async (req, res) => {
        const { username, password } = req.body;
        // Check if this is the FIRST user
        const countResult = await db('users').count('id as count').first();
        const isFirstUser = countResult.count === 0;

        // If not first user, registration must be done via Admin panel
        if (!isFirstUser && (!req.user || req.user.role !== 'ADMIN')) {
            return res.status(403).json({ message: 'Registration is closed. Ask an admin.' });
        }

        try {
            const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
            const role = isFirstUser ? 'ADMIN' : 'USER';
            const [id] = await db('users').insert({
                username,
                password_hash: hashedPassword,
                role
            });

            const token = jwt.sign({ id, username, role }, JWT_SECRET, { expiresIn: '7d' });
            
            // If first user, seed demo data
            if (isFirstUser) {
                const listId = await db('lists').insert({ title: 'Groceries', description: 'Example', owner_id: id }).then(ids => ids[0]);
                await db('tasks').insert([
                    { description: 'Milk', list_id: listId, importance: 1 },
                    { description: 'Eggs', list_id: listId, importance: 2 }
                ]);
            }

            res.json({ token, user: { id, username, role } });
        } catch (error) {
            res.status(400).json({ message: 'Username likely taken.' });
        }
    });

    router.post('/users/login', async (req, res) => {
        const { username, password } = req.body;
        const user = await db('users').where({ username }).first();

        if (user && (await bcrypt.compare(password, user.password_hash))) {
            const expiresIn = user.session_timeout || process.env.SESSION_TIMEOUT || '7d';
            const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn });
            
            // Log successful login for security auditing
            if (user.role === 'ADMIN') {
                logActivity(db, 'INFO', `Admin login: ${username}`);
            }
            
            res.json({ token, user: { id: user.id, username: user.username, role: user.role, sessionTimeout: user.session_timeout } });
        } else {
            res.status(401).json({ message: 'Invalid credentials' });
        }
    });

    router.get('/users/me', authenticate, async (req, res) => {
        const user = await db('users').where({ id: req.user.id }).first();
        if (user) {
            res.json({ id: user.id, username: user.username, role: user.role, sessionTimeout: user.session_timeout });
        } else {
            res.status(404).json({ message: 'User not found' });
        }
    });

    router.put('/users/me', authenticate, async (req, res) => {
        const { username, password, currentPassword, sessionTimeout } = req.body;
        const userId = req.user.id;

        const user = await db('users').where({ id: userId }).first();
        if (!user) return res.status(404).json({ message: 'User not found' });

        const isMatch = await bcrypt.compare(currentPassword, user.password_hash);
        if (!isMatch) return res.status(401).json({ message: 'Current password incorrect' });

        const updates = {};
        if (username) updates.username = username;
        if (sessionTimeout !== undefined) updates.session_timeout = sessionTimeout;
        if (password) {
            updates.password_hash = await bcrypt.hash(password, SALT_ROUNDS);
        }

        try {
            await db('users').where({ id: userId }).update(updates);
            const updated = await db('users').where({ id: userId }).first();
            res.json({ id: updated.id, username: updated.username, role: updated.role, sessionTimeout: updated.session_timeout });
        } catch (e) {
            res.status(500).json({ message: 'Update failed' });
        }
    });

    router.get('/users', authenticate, async (req, res) => {
        try {
            const users = await db('users').select('id', 'username', 'role');
            if (req.user.role === 'ADMIN') {
                for (const u of users) {
                    const listCount = await db('lists').where({ owner_id: u.id }).count('id as count').first();
                    const taskCount = await db('tasks')
                        .join('lists', 'tasks.list_id', 'lists.id')
                        .where('lists.owner_id', u.id)
                        .count('tasks.id as count')
                        .first();
                        
                    u.listCount = listCount.count;
                    u.taskCount = taskCount.count;
                }
            }
            res.json(users);
        } catch (e) {
            res.status(500).json({ message: "Failed to fetch users" });
        }
    });
    
    // --- Admin User Management ---
    
    router.delete('/users/:id', authenticate, adminOnly, async (req, res) => {
        const targetId = parseInt(req.params.id);
        if (targetId === req.user.id) return res.status(400).json({ message: "Cannot delete yourself." });
        
        try {
            await db('users').where({ id: targetId }).del();
            logActivity(db, 'WARN', `Admin deleted user ID ${targetId}`);
            res.json({ success: true });
        } catch (e) {
            res.status(500).json({ message: "Failed to delete user." });
        }
    });

    router.post('/users/:id/reset-password', authenticate, adminOnly, async (req, res) => {
        const targetId = parseInt(req.params.id);
        const { newPassword } = req.body;
        
        if (!newPassword || newPassword.length < 6) return res.status(400).json({ message: "Password too short." });

        try {
            const hashedPassword = await bcrypt.hash(newPassword, SALT_ROUNDS);
            await db('users').where({ id: targetId }).update({ password_hash: hashedPassword });
            logActivity(db, 'WARN', `Admin reset password for user ID ${targetId}`);
            res.json({ success: true });
        } catch (e) {
            res.status(500).json({ message: "Failed to reset password." });
        }
    });

    // --- Admin Logs ---

    router.get('/admin/logs', authenticate, adminOnly, async (req, res) => {
        try {
            const logs = await db('activity_log').orderBy('timestamp', 'desc').limit(100);
            res.json(logs);
        } catch (e) {
            res.status(500).json({ message: 'Failed to fetch logs' });
        }
    });

    router.delete('/admin/logs', authenticate, adminOnly, async (req, res) => {
        try {
            await db('activity_log').del();
            logActivity(db, 'INFO', `Logs cleared by ${req.user.username}`);
            res.json({ success: true });
        } catch (e) {
            res.status(500).json({ message: 'Failed to clear logs' });
        }
    });
    
    // --- Admin Hierarchy Tools ---
    
    router.get('/admin/hierarchy-report', authenticate, adminOnly, async (req, res) => {
        try {
            // Find lists that have a parent_id but might be disconnected
            const issues = await db('lists as child')
                .leftJoin('lists as parent', 'child.parent_id', 'parent.id')
                .whereNotNull('child.parent_id')
                .select(
                    'child.id as childId', 'child.title as childTitle', 'child.owner_id as childOwnerId',
                    'parent.id as parentId', 'parent.title as parentTitle', 'parent.owner_id as parentOwnerId'
                );
            
            const results = [];
            for (const issue of issues) {
                if (!issue.parentId) {
                    results.push({ type: 'DELETED', ...issue });
                } else if (issue.childOwnerId !== issue.parentOwnerId) {
                    // Check if shared
                    const shared = await db('list_shares').where({ list_id: issue.parentId, user_id: issue.childOwnerId }).first();
                    if (!shared) {
                        results.push({ type: 'PERMISSION', ...issue });
                    }
                }
            }
            res.json(results);
        } catch (e) {
            res.status(500).json({ message: "Analysis failed" });
        }
    });
    
    router.post('/admin/hierarchy-fix-permission', authenticate, adminOnly, async (req, res) => {
        const { childOwnerId, parentId } = req.body;
        try {
            // Fix permission by sharing the parent list with the child owner
            const exists = await db('list_shares').where({ list_id: parentId, user_id: childOwnerId }).first();
            if (!exists) {
                await db('list_shares').insert({ list_id: parentId, user_id: childOwnerId, permission: 'VIEW' });
                logActivity(db, 'WARN', `Admin fixed hierarchy: Shared List ${parentId} with User ${childOwnerId}`);
            }
            res.json({ success: true });
        } catch(e) {
            res.status(500).json({ message: "Fix failed" });
        }
    });

    // --- List Routes ---

    router.get('/lists', authenticate, async (req, res) => {
        const userId = req.user.id;
        
        // 1. Get Accessible Lists (Owned + Shared)
        const ownedLists = await db('lists').where({ owner_id: userId });
        
        const sharedShares = await db('list_shares').where({ user_id: userId });
        const sharedListIds = sharedShares.map(s => s.list_id);
        const sharedLists = await db('lists').whereIn('id', sharedListIds);

        // Map for easy access and dedup
        const allListsMap = new Map();
        [...ownedLists, ...sharedLists].forEach(l => allListsMap.set(l.id, l));

        // 2. Recursive Ghost Parent Fetching
        // This ensures that if a list points to a parent that the user doesn't strictly "own" or "share",
        // we still fetch the parent stub so the tree renders correctly.
        let iterationLimit = 0;
        while(iterationLimit < 5) { // Max depth protection
            const neededParents = new Set();
            for (const list of allListsMap.values()) {
                if (list.parent_id && !allListsMap.has(list.parent_id)) {
                    neededParents.add(list.parent_id);
                }
            }

            if (neededParents.size === 0) break;

            const ghosts = await db('lists').whereIn('id', Array.from(neededParents));
            if (ghosts.length === 0) break; 

            for (const ghost of ghosts) {
                ghost.isGhost = true; 
                allListsMap.set(ghost.id, ghost);
            }
            iterationLimit++;
        }
        
        const result = [];
        for (const list of allListsMap.values()) {
            // For ghost lists, we don't fetch tasks or shares, and permission is NONE
            if (list.isGhost) {
                result.push({
                    ...list,
                    parentId: list.parent_id, // Map DB snake_case to frontend camelCase
                    ownerId: list.owner_id,
                    tasks: [],
                    sharedWith: [],
                    currentUserPermission: 'NONE', 
                    pinned: false
                });
                continue;
            }

            const tasks = await db('tasks').where({ list_id: list.id }).orderBy('sort_order', 'asc');
            
            const shares = await db('list_shares')
                .join('users', 'list_shares.user_id', 'users.id')
                .where('list_shares.list_id', list.id)
                .select('users.id', 'users.username', 'users.role', 'list_shares.permission');
            
            let currentUserPermission = 'OWNER';
            if (list.owner_id !== userId) {
                const share = sharedShares.find(s => s.list_id === list.id);
                currentUserPermission = share ? share.permission : 'VIEW';
            }

            result.push({
                ...list,
                parentId: list.parent_id, // Map DB snake_case to frontend camelCase
                ownerId: list.owner_id,   // Map DB snake_case to frontend camelCase
                pinned: !!list.pinned,
                tasks: tasks.map(t => ({ 
                    ...t, 
                    createdAt: t.created_at, // Map DB snake_case to frontend camelCase
                    completed: !!t.completed, 
                    pinned: !!t.pinned, 
                    focused: !!t.focused,
                    parentTaskId: t.parent_task_id, // Map new column
                    isParentSelectable: !!t.is_parent_selectable // Map new column
                })),
                sharedWith: shares,
                currentUserPermission
            });
        }
        
        res.json(result);
    });

    router.post('/lists', authenticate, async (req, res) => {
        const { title, parentId } = req.body;
        
        if (title.length > 20) return res.status(400).json({ message: "List title too long (Max 20)." });

        // Limit Check
        const listsCount = await db('lists').where({ owner_id: req.user.id }).count('id as count').first();
        if (listsCount.count >= 50) return res.status(400).json({ message: "List limit reached (50)." });

        try {
            const [id] = await db('lists').insert({
                title,
                description: '',
                owner_id: req.user.id,
                parent_id: parentId || null
            });
            res.json({ id });
        } catch (e) {
            res.status(500).json({ message: 'Failed to create list' });
        }
    });

    router.delete('/lists/:id', authenticate, async (req, res) => {
        const listId = req.params.id;
        // Recursive delete handled by DB CASCADE usually, but let's verify owner
        const list = await db('lists').where({ id: listId }).first();
        if (!list) return res.status(404).json({ message: 'List not found' });
        if (list.owner_id !== req.user.id) return res.status(403).json({ message: 'Only owner can delete' });

        await db('lists').where({ id: listId }).del();
        res.json({ success: true });
    });

    router.put('/lists/:id', authenticate, async (req, res) => {
        const { title, parentId, pinned } = req.body;
        const listId = req.params.id;
        
        const list = await db('lists').where({ id: listId }).first();
        if (!list) return res.status(404).json({ message: 'List not found' });
        if (list.owner_id !== req.user.id) return res.status(403).json({ message: 'Only owner can edit list settings' });

        const updates = {};
        if (title !== undefined) {
             if (title.length > 20) return res.status(400).json({ message: "Title max 20 chars." });
             updates.title = title;
        }
        if (parentId !== undefined) {
            // Circular check
            if (parentId === list.id) return res.status(400).json({ message: "Cannot move into self" });
            updates.parent_id = parentId;
        }
        if (pinned !== undefined) updates.pinned = pinned;

        await db('lists').where({ id: listId }).update(updates);
        res.json({ success: true });
    });

    router.post('/lists/:id/merge', authenticate, async (req, res) => {
        const { targetId } = req.body;
        const sourceId = req.params.id;
        
        const source = await db('lists').where({ id: sourceId }).first();
        const target = await db('lists').where({ id: targetId }).first();
        
        if (!source || !target) return res.status(404).json({ message: 'List not found' });
        if (source.owner_id !== req.user.id || target.owner_id !== req.user.id) {
            return res.status(403).json({ message: 'Ownership required' });
        }

        // Move tasks
        await db('tasks').where({ list_id: sourceId }).update({ list_id: targetId });
        // Delete source
        await db('lists').where({ id: sourceId }).del();
        
        res.json({ success: true });
    });

    router.post('/lists/:id/shares', authenticate, async (req, res) => {
        const listId = req.params.id;
        const { userId, permission } = req.body;
        
        const list = await db('lists').where({ id: listId }).first();
        if (list.owner_id !== req.user.id) return res.status(403).json({ message: 'Only owner can share' });

        // Add or Update share
        // Using raw for upsert or just simple insert/update logic
        const existing = await db('list_shares').where({ list_id: listId, user_id: userId }).first();
        if (existing) {
            await db('list_shares').where({ list_id: listId, user_id: userId }).update({ permission });
        } else {
            await db('list_shares').insert({ list_id: listId, user_id: userId, permission });
        }
        res.json({ success: true });
    });

    router.delete('/lists/:id/shares/:userId', authenticate, async (req, res) => {
        const listId = req.params.id;
        const targetUserId = Number(req.params.userId);
        
        const list = await db('lists').where({ id: listId }).first();
        
        // Owner can remove anyone. User can remove themselves.
        if (list.owner_id !== req.user.id && req.user.id !== targetUserId) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        await db('list_shares').where({ list_id: listId, user_id: targetUserId }).del();
        res.json({ success: true });
    });
    
    router.post('/lists/:id/transfer', authenticate, async (req, res) => {
        const listId = parseInt(req.params.id);
        const { newOwnerId } = req.body;
        
        const list = await db('lists').where({ id: listId }).first();
        if (!list) return res.status(404).json({ message: "List not found" });

        // Allow Owner OR Admin
        if (list.owner_id !== req.user.id && req.user.role !== 'ADMIN') {
            return res.status(403).json({ message: 'Only owner or admin can transfer' });
        }
        
        await db.transaction(async trx => {
            // Find ALL descendant list IDs (Recursive ownership transfer)
            const allListIds = await getFamilyTreeIds(trx, listId);

            // 1. Update Owner for ROOT and ALL DESCENDANTS
            await trx('lists').whereIn('id', allListIds).update({ owner_id: newOwnerId });
            
            // 2. Handle Sharing for the Old Owner (only on the root transferred list to maintain access)
            // If ADMIN is doing the transfer, we add the *original owner* as shared.
            const oldOwnerId = list.owner_id;
            
            // Do not share if the new owner is the same as the old owner (redundant check but safe)
            if (oldOwnerId !== newOwnerId) {
                const existingShare = await trx('list_shares').where({ list_id: listId, user_id: oldOwnerId }).first();
                if (!existingShare) {
                    await trx('list_shares').insert({ list_id: listId, user_id: oldOwnerId, permission: 'FULL' });
                } else {
                    await trx('list_shares').where({ list_id: listId, user_id: oldOwnerId }).update({ permission: 'FULL' });
                }
            }
            
            // 3. Remove new owner from shares if they were there (on any of the transferred lists)
            // This cleans up redundant shares since they are now the owner.
            await trx('list_shares').whereIn('list_id', allListIds).where({ user_id: newOwnerId }).del();
        });
        
        if (req.user.role === 'ADMIN' && list.owner_id !== req.user.id) {
            logActivity(db, 'WARN', `Admin forced transfer of List ${listId} (and descendants) from User ${list.owner_id} to User ${newOwnerId}`);
        }
        
        res.json({ success: true });
    });

    // --- Task Routes ---

    router.post('/lists/:id/tasks', authenticate, async (req, res) => {
        const listId = req.params.id;
        const { description } = req.body;
        
        // Permission Check
        const list = await db('lists').where({ id: listId }).first();
        if (!list) return res.status(404).json({ message: 'List not found' });
        
        let hasAccess = list.owner_id === req.user.id;
        if (!hasAccess) {
            const share = await db('list_shares').where({ list_id: listId, user_id: req.user.id }).first();
            if (share && share.permission !== 'VIEW') hasAccess = true;
        }
        if (!hasAccess) return res.status(403).json({ message: 'Read only access' });

        // Limits
        const taskCount = await db('tasks').where({ list_id: listId }).count('id as count').first();
        if (taskCount.count >= 50) return res.status(400).json({ message: "List is full (Max 50 tasks)." });

        const [id] = await db('tasks').insert({
            description: description.substring(0, 102),
            list_id: listId,
            completed: false,
            importance: 0,
            is_parent_selectable: true // Default Active
        });
        // Update sort order to be ID
        await db('tasks').where({ id }).update({ sort_order: id, global_sort_order: id });
        
        res.json({ id });
    });

    router.post('/lists/:id/tasks/bulk', authenticate, async (req, res) => {
        const listId = req.params.id;
        const { tasks } = req.body; // Array of { description, ... }
        
        // Simply loop insert for simplicity, ideally transactions
        try {
            await db.transaction(async trx => {
                for (const t of tasks) {
                    const [id] = await trx('tasks').insert({
                        description: t.description.substring(0, 102),
                        list_id: listId,
                        completed: t.completed,
                        importance: t.importance || 0,
                        dueDate: t.dueDate,
                        created_at: t.createdAt,
                        is_parent_selectable: true
                    });
                    await trx('tasks').where({ id }).update({ sort_order: id, global_sort_order: id });
                }
            });
            res.json({ success: true });
        } catch (e) {
            res.status(500).json({ message: 'Bulk import failed' });
        }
    });

    router.put('/lists/:id/tasks/bulk-status', authenticate, async (req, res) => {
        const listId = req.params.id;
        const { completed } = req.body;
        await db('tasks').where({ list_id: listId }).update({ completed });
        res.json({ success: true });
    });
    
    router.put('/lists/:id/tasks/reorder', authenticate, async (req, res) => {
        const { tasks } = req.body; // [{id, sortOrder}]
        await db.transaction(async trx => {
            for (const t of tasks) {
                await trx('tasks').where({ id: t.id }).update({ sort_order: t.sortOrder });
            }
        });
        res.json({ success: true });
    });
    
    router.put('/tasks/reorder-global', authenticate, async (req, res) => {
        const { tasks } = req.body; // [{id, globalSortOrder}]
        await db.transaction(async trx => {
            for (const t of tasks) {
                await trx('tasks').where({ id: t.id }).update({ global_sort_order: t.globalSortOrder });
            }
        });
        res.json({ success: true });
    });

    router.delete('/lists/:id/tasks/completed', authenticate, async (req, res) => {
        const listId = req.params.id;
        await db('tasks').where({ list_id: listId, completed: true }).del();
        res.json({ success: true });
    });

    router.delete('/tasks/:id', authenticate, async (req, res) => {
        // Need to check permissions for the LIST this task belongs to
        const task = await db('tasks').where({ id: req.params.id }).first();
        if (!task) return res.status(404).json({ message: 'Task not found' });
        
        const list = await db('lists').where({ id: task.list_id }).first();
        let hasAccess = list.owner_id === req.user.id;
        if (!hasAccess) {
            const share = await db('list_shares').where({ list_id: list.id, user_id: req.user.id }).first();
            if (share && share.permission === 'FULL') hasAccess = true;
        }
        
        if (!hasAccess) return res.status(403).json({ message: 'Cannot delete task' });

        await db('tasks').where({ id: req.params.id }).del();
        res.json({ success: true });
    });

    router.put('/tasks/:id', authenticate, async (req, res) => {
        const changes = req.body;
        const task = await db('tasks').where({ id: req.params.id }).first();
        if (!task) return res.status(404).json({ message: 'Task not found' });

        // Sanitize
        const updates = {};
        if (changes.description !== undefined) updates.description = changes.description.substring(0, 102);
        if (changes.completed !== undefined) updates.completed = changes.completed;
        if (changes.importance !== undefined) updates.importance = changes.importance;
        if (changes.dueDate !== undefined) updates.dueDate = changes.dueDate;
        if (changes.pinned !== undefined) updates.pinned = changes.pinned;
        // Old field support (ignored or cleared)
        if (changes.dependsOn !== undefined) updates.dependsOn = changes.dependsOn;
        // New field support
        if (changes.parentTaskId !== undefined) updates.parent_task_id = changes.parentTaskId;
        if (changes.isParentSelectable !== undefined) updates.is_parent_selectable = changes.isParentSelectable;
        
        if (changes.focused !== undefined) {
            if (changes.focused) {
                updates.focused = true;
            } else {
                updates.focused = false;
            }
        }

        await db('tasks').where({ id: req.params.id }).update(updates);
        res.json({ success: true });
    });
    
    router.post('/tasks/:id/copy', authenticate, async (req, res) => {
        const { targetListId, move } = req.body;
        const task = await db('tasks').where({ id: req.params.id }).first();
        if (!task) return res.status(404).json({ message: 'Task not found' });
        
        // Insert new
        await db('tasks').insert({
            description: task.description,
            completed: task.completed,
            importance: task.importance,
            dueDate: task.dueDate,
            list_id: targetListId,
            sort_order: 0,
            is_parent_selectable: true
        });
        
        if (move) {
            await db('tasks').where({ id: task.id }).del();
        }
        res.json({ success: true });
    });

    // --- Admin Routes ---

    router.get('/admin/backup', authenticate, adminOnly, (req, res) => {
        const dbPath = process.env.NODE_ENV === 'production' ? '/app/data/taskbox.db' : './data/taskbox.db';
        res.download(dbPath, 'taskbox-backup.db');
    });

    router.post('/admin/restore', authenticate, adminOnly, async (req, res) => {
        const { fileData } = req.body;
        if (!fileData) return res.status(400).json({ message: 'No file data provided.' });

        const dbPath = process.env.NODE_ENV === 'production' ? '/app/data' : './data';
        const liveDbFile = path.join(dbPath, 'taskbox.db');
        const tempDbFile = path.join(dbPath, 'restore_temp.db');

        try {
            // 1. Write uploaded data to a temporary file
            const buffer = Buffer.from(fileData, 'base64');
            fs.writeFileSync(tempDbFile, buffer);

            // 2. Verify Integrity
            const tempKnex = knex({
                client: 'sqlite3',
                connection: { filename: tempDbFile },
                useNullAsDefault: true
            });

            try {
                const integrity = await tempKnex.raw('PRAGMA integrity_check');
                const checkResult = integrity[0]['integrity_check'];
                if (checkResult !== 'ok') throw new Error(`Corrupt Database: ${checkResult}`);
                const hasUsers = await tempKnex.schema.hasTable('users');
                if (!hasUsers) throw new Error("Invalid Database: Missing 'users' table.");
            } catch (validationErr) {
                await tempKnex.destroy();
                if (fs.existsSync(tempDbFile)) fs.unlinkSync(tempDbFile);
                logActivity(db, 'ERROR', `Restore failed: ${validationErr.message}`);
                return res.status(400).json({ message: `Validation Failed: ${validationErr.message}` });
            }

            await tempKnex.destroy();
            await db.destroy();

            const backupPath = path.join(dbPath, `taskbox_pre_restore_${Date.now()}.bak`);
            if (fs.existsSync(liveDbFile)) fs.renameSync(liveDbFile, backupPath);
            
            fs.renameSync(tempDbFile, liveDbFile);
            
            console.log("Database restored. Server restarting...");
            res.json({ message: 'Restore successful. Server is restarting...' });
            
            setTimeout(() => process.exit(0), 1000);

        } catch (e) {
            console.error(e);
            if (fs.existsSync(tempDbFile)) fs.unlinkSync(tempDbFile);
            res.status(500).json({ message: 'Restore failed during processing.' });
        }
    });
    
    router.post('/admin/maintenance', authenticate, adminOnly, async (req, res) => {
        const { action, userId } = req.body;
        try {
            if (action === 'vacuum') {
                await db.raw('VACUUM');
                res.json({ message: 'Database optimized (VACUUM).' });
            } else if (action === 'prune') {
                // Remove tasks where list_id doesn't exist
                const deleted = await db('tasks').whereNotExists(function() {
                    this.select('*').from('lists').whereRaw('lists.id = tasks.list_id');
                }).del();
                res.json({ message: `Pruned ${deleted} orphaned tasks.` });
            } else if (action === 'purge_all') {
                await db('tasks').del();
                await db('lists').del();
                res.json({ message: 'All lists and tasks purged.' });
            } else if (action === 'reset_defaults') {
                await db('tasks').del();
                await db('lists').del();
                // Seed for admin
                const admin = await db('users').where({ role: 'ADMIN' }).first();
                if (admin) {
                    const [listId] = await db('lists').insert({ title: 'Groceries', owner_id: admin.id }).then(ids => ids);
                    await db('tasks').insert([
                        { description: 'Milk', list_id: listId, importance: 1 },
                        { description: 'Eggs', list_id: listId, importance: 2 }
                    ]);
                }
                res.json({ message: 'Reset to default data.' });
            } else if (action === 'check_integrity') {
                const integrity = await db.raw('PRAGMA integrity_check');
                const result = integrity[0]['integrity_check'];
                res.json({ healthy: result === 'ok', message: `Integrity: ${result}` });
            } else if (action === 'fix_hierarchy') {
                // Find lists with invalid parents and set them to root
                // This typically happens if parents were deleted or during migration/restore
                const orphaned = await db('lists')
                    .whereNotNull('parent_id')
                    .whereNotExists(function() {
                        this.select('*').from('lists as parents').whereRaw('lists.parent_id = parents.id');
                    })
                    .update({ parent_id: null });
                logActivity(db, 'WARN', `Admin ran Hierarchy Repair. ${orphaned} lists moved to Top Level.`);
                res.json({ message: `Fixed hierarchy. ${orphaned} invisible lists moved to Top Level.` });
            } else if (action === 'repair_relationships') {
                // Clear all parent/child links globally
                const updated = await db('tasks').update({ 
                    parent_task_id: null,
                    is_parent_selectable: true 
                });
                logActivity(db, 'WARN', `Admin ran Relationship Repair. ${updated} tasks reset to flat structure.`);
                res.json({ message: `All task relationships cleared. ${updated} tasks reset.` });
            } else {
                res.status(400).json({ message: 'Unknown action' });
            }
        } catch (e) {
            res.status(500).json({ message: 'Action failed' });
        }
    });

    return router;
}
