
import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import fs from 'fs';
import path from 'path';
import { seedDatabase } from './database.js'; // Import seeding function

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-key-that-should-be-in-an-env-file';
const DEFAULT_SESSION_TIMEOUT = process.env.SESSION_TIMEOUT || '7d';
const SALT_ROUNDS = 10;
const DB_PATH = process.env.NODE_ENV === 'production' ? '/app/data/taskbox.db' : './data/taskbox.db';

// --- LIMITS CONFIGURATION ---
const LIMITS = {
    MAX_USERS: 5,
    MAX_ROOT_LISTS: 20,
    MAX_CHILDREN_PER_LIST: 10,
    MAX_TASKS_PER_LIST: 50,
    MAX_TOTAL_TASKS_PER_USER: 5000
};

const logActivity = (db, level, message) => {
    db('activity_log').insert({ level, message })
        .then(() => {
            return db('activity_log')
                .where('timestamp', '<', db.raw("date('now', '-30 days')"))
                .del();
        })
        .catch(err => console.error("Logging failed:", err));
};

const normalizeTask = (task) => {
    if (!task) return null;
    return {
        ...task,
        createdAt: task.created_at, 
        completed: Boolean(task.completed),
        pinned: Boolean(task.pinned),
        focused: Boolean(task.focused)
    };
};

const authMiddleware = (db) => async (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'Authentication token required.' });
    }
    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        const [user] = await db('users').where('id', decoded.userId).select('id', 'username', 'role', 'session_timeout');
        if (!user) {
            return res.status(401).json({ message: 'User not found.' });
        }
        req.user = user;
        next();
    } catch (error) {
        return res.status(401).json({ message: 'Invalid or expired token.' });
    }
};

const adminOnly = (req, res, next) => {
    if (req.user && req.user.role === 'ADMIN') {
        return next();
    }
    return res.status(403).json({ message: 'Administrator access required.' });
};

const checkDependencyDepth = async (db, targetId) => {
    let depth = 1; 
    let currentId = targetId;
    
    // Check the depth of the chain we are attaching to
    while (currentId) {
        if (depth >= 5) return false; 
        
        const [task] = await db('tasks').where('id', currentId).select('dependsOn');
        if (!task || !task.dependsOn) break;
        
        currentId = task.dependsOn;
        depth++;
    }
    return true;
};


export function createApiRouter(db) {
  const router = express.Router();
  const authenticate = authMiddleware(db);

  // --- Public Routes ---
  router.get('/users/any-exist', async (req, res) => {
      const users = await db('users').select('id').limit(1);
      res.json({ usersExist: users.length > 0 });
  });

  router.post('/users/register', async (req, res) => {
      const { username, password } = req.body;
      
      const usersCountResult = await db('users').count('id as count').first();
      const userCount = usersCountResult.count;

      // Limit Check: Max Users
      if (userCount >= LIMITS.MAX_USERS) {
          return res.status(403).json({ message: `Registration closed. Max users (${LIMITS.MAX_USERS}) reached.` });
      }

      const role = userCount === 0 ? 'ADMIN' : 'USER';
      if (role === 'USER') return res.status(403).json({ message: 'Registration is closed.' });
      if (!username || !password) return res.status(400).json({ message: 'Username and password required.' });
      if (password.length < 6) return res.status(400).json({ message: 'Password too short.' });

      const password_hash = await bcrypt.hash(password, SALT_ROUNDS);
      const [userId] = await db('users').insert({ username, password_hash, role });
      logActivity(db, 'INFO', `Initial admin user '${username}' created.`);
      
      // Seed data for the first admin user
      if (role === 'ADMIN') {
          await seedDatabase(db, userId);
      }

      const token = jwt.sign({ userId }, JWT_SECRET, { expiresIn: DEFAULT_SESSION_TIMEOUT });
      res.status(201).json({ token, user: { id: userId, username, role } });
  });

  router.post('/users/login', async (req, res) => {
      const { username, password } = req.body;
      const [user] = await db('users').where('username', username);
      if (user && await bcrypt.compare(password, user.password_hash)) {
          const timeout = user.session_timeout || DEFAULT_SESSION_TIMEOUT;
          const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: timeout });
          logActivity(db, 'INFO', `User '${username}' logged in.`);
          res.json({ token, user: { id: user.id, username: user.username, role: user.role, sessionTimeout: user.session_timeout } });
      } else {
          logActivity(db, 'WARN', `Failed login for '${username}'.`);
          res.status(401).json({ message: 'Invalid credentials.' });
      }
  });

  // --- Protected Routes ---
  router.get('/users/me', authenticate, (req, res) => {
      res.json({ id: req.user.id, username: req.user.username, role: req.user.role, sessionTimeout: req.user.session_timeout });
  });
  
  router.put('/users/me', authenticate, async (req, res) => {
      const { username, password, currentPassword, sessionTimeout } = req.body;
      const [currentUser] = await db('users').where('id', req.user.id);
      if (!await bcrypt.compare(currentPassword, currentUser.password_hash)) {
          return res.status(401).json({ message: 'Current password incorrect.' });
      }
      const updateData = {};
      if (username && username !== currentUser.username) {
          const [existing] = await db('users').where({ username });
          if (existing) return res.status(409).json({ message: 'Username taken.' });
          updateData.username = username;
      }
      if (password) updateData.password_hash = await bcrypt.hash(password, SALT_ROUNDS);
      if (sessionTimeout !== undefined) updateData.session_timeout = sessionTimeout;

      if (Object.keys(updateData).length > 0) {
          await db('users').where('id', req.user.id).update(updateData);
      }
      const [updatedUser] = await db('users').where('id', req.user.id).select('id', 'username', 'role', 'session_timeout');
      res.json(updatedUser);
  });
  
  router.get('/users', authenticate, async (req, res) => {
      const users = await db('users').select('id', 'username', 'role');
      res.json(users);
  });

  // --- Admin Routes ---
  router.post('/admin/users', authenticate, adminOnly, async (req, res) => {
      const { username, password } = req.body;
      
      const usersCountResult = await db('users').count('id as count').first();
      if (usersCountResult.count >= LIMITS.MAX_USERS) {
          return res.status(403).json({ message: `Max users (${LIMITS.MAX_USERS}) reached.` });
      }

      const password_hash = await bcrypt.hash(password, SALT_ROUNDS);
      const [userId] = await db('users').insert({ username, password_hash, role: 'USER' });
      const [newUser] = await db('users').where({ id: userId }).select('id', 'username', 'role');
      logActivity(db, 'INFO', `Admin created user '${username}'.`);
      res.status(201).json(newUser);
  });
  
  router.delete('/admin/users/:id', authenticate, adminOnly, async (req, res) => {
      if (Number(req.params.id) === req.user.id) return res.status(400).json({ message: 'Cannot delete self.' });
      await db('users').where({ id: req.params.id }).del();
      logActivity(db, 'WARN', `Admin deleted user ID ${req.params.id}.`);
      res.status(204).send();
  });

  router.put('/admin/users/:id/password', authenticate, adminOnly, async (req, res) => {
      const { newPassword } = req.body;
      const password_hash = await bcrypt.hash(newPassword, SALT_ROUNDS);
      await db('users').where({ id: req.params.id }).update({ password_hash });
      res.status(200).json({ message: 'Password updated.' });
  });
  
  router.get('/admin/logs', authenticate, adminOnly, async (req, res) => {
      const logs = await db('activity_log').orderBy('timestamp', 'desc').limit(100);
      res.json(logs);
  });

  router.delete('/admin/logs', authenticate, adminOnly, async (req, res) => {
      await db('activity_log').del();
      res.status(204).send();
  });
  
  // Database Backup
  router.get('/admin/backup', authenticate, adminOnly, (req, res) => {
      if (fs.existsSync(DB_PATH)) {
          logActivity(db, 'INFO', 'Admin downloaded database backup.');
          res.download(DB_PATH, 'taskbox.db');
      } else {
          res.status(404).json({ message: 'Database file not found.' });
      }
  });

  // Database Restore
  router.post('/admin/restore', authenticate, adminOnly, async (req, res) => {
      const { fileData } = req.body;
      if (!fileData) return res.status(400).json({ message: 'No file data provided.' });

      try {
          const buffer = Buffer.from(fileData, 'base64');
          // Write the new DB file
          fs.writeFileSync(DB_PATH, buffer);
          
          logActivity(db, 'WARN', 'Admin restored database from backup. Restarting...');
          
          // Respond success first
          res.json({ message: 'Database restored successfully. Server restarting...' });
          
          // Trigger restart to reload DB connection
          setTimeout(() => {
              console.log("Restarting server for DB restore...");
              process.exit(0);
          }, 1000);
          
      } catch (e) {
          console.error('Restore failed:', e);
          res.status(500).json({ message: 'Restore failed: ' + e.message });
      }
  });

  router.post('/admin/maintenance', authenticate, adminOnly, async (req, res) => {
      const { action } = req.body;
      try {
          if (action === 'vacuum') {
              await db.raw('VACUUM');
              logActivity(db, 'INFO', 'Admin executed database VACUUM.');
              return res.json({ message: 'Database optimized (VACUUM).' });
          } 
          else if (action === 'prune') {
              await db('tasks')
                .whereNotIn('list_id', db.select('id').from('lists'))
                .del();
              logActivity(db, 'INFO', 'Admin pruned orphaned tasks.');
              return res.json({ message: 'Orphaned tasks pruned.' });
          } 
          else if (action === 'purge_all') {
              await db('tasks').del();
              await db('list_shares').del();
              await db('lists').del();
              await db('sqlite_sequence').whereIn('name', ['tasks', 'lists']).update({ seq: 0 });
              logActivity(db, 'WARN', 'Admin PURGED ALL DATA.');
              return res.json({ message: 'All lists and tasks deleted.' });
          }
          else if (action === 'reset_defaults') {
              await db('tasks').del();
              await db('list_shares').del();
              await db('lists').del();
              await db('sqlite_sequence').whereIn('name', ['tasks', 'lists']).update({ seq: 0 });
              await seedDatabase(db, req.user.id);
              logActivity(db, 'WARN', 'Admin RESET database to Default Demo Data.');
              return res.json({ message: 'Database reset to default demo data.' });
          }
          return res.status(400).json({ message: 'Invalid action.' });
      } catch (e) {
          console.error(e);
          res.status(500).json({ message: 'Maintenance operation failed.' });
      }
  });

  // --- List Routes (Nested) ---
  router.get('/lists', authenticate, async (req, res) => {
      const ownedLists = await db('lists').where('owner_id', req.user.id);
      
      // Get shared lists with permissions
      const shares = await db('list_shares').where('user_id', req.user.id);
      const sharedListIds = shares.map(s => s.list_id);
      const sharedLists = await db('lists').whereIn('id', sharedListIds);
      
      const permissionsMap = new Map();
      shares.forEach(s => permissionsMap.set(s.list_id, s.permission));

      const allUserLists = [...ownedLists, ...sharedLists];
      const uniqueLists = Array.from(new Map(allUserLists.map(list => [list.id, list])).values());
      const allListIds = uniqueLists.map(l => l.id);

      if (allListIds.length === 0) return res.json([]);

      const [tasks, allShares, users] = await Promise.all([
          db('tasks').whereIn('list_id', allListIds),
          db('list_shares').whereIn('list_id', allListIds),
          db('users').select('id', 'username')
      ]);
      
      const usersById = users.reduce((acc, u) => ({...acc, [u.id]: u }), {});
      
      const listsWithDetails = uniqueLists.map(list => {
          const listShares = allShares.filter(s => s.list_id === list.id);
          const rawTasks = tasks.filter(task => task.list_id === list.id).sort((a,b) => a.id - b.id);
          
          let currentUserPermission = 'OWNER';
          if (list.owner_id !== req.user.id) {
              currentUserPermission = permissionsMap.get(list.id) || 'VIEW';
          }

          return {
              ...list,
              pinned: Boolean(list.pinned),
              ownerId: list.owner_id,
              parentId: list.parent_id,
              tasks: rawTasks.map(normalizeTask),
              sharedWith: listShares.map(s => ({
                  ...usersById[s.user_id],
                  permission: s.permission
              })).filter(u => u.username),
              currentUserPermission
          };
      });
      res.json(listsWithDetails);
  });
  
  router.post('/lists', authenticate, async (req, res) => {
    const { title, description, parentId } = req.body;
    if (!title) return res.status(400).json({ message: "Title required." });
    
    let validParentId = null;
    if (parentId) {
        const [parent] = await db('lists').where({ id: parentId, owner_id: req.user.id });
        if (!parent) return res.status(403).json({ message: "Cannot create sublist in a list you don't own." });
        
        // Depth Check: Allow 3 levels (Top -> Master -> Sub)
        if (parent.parent_id) {
            const [grandparent] = await db('lists').where({ id: parent.parent_id });
            if (grandparent && grandparent.parent_id) {
                 return res.status(409).json({ message: "Max nesting depth reached (3 tiers)." });
            }
        }

        // Limit Check: Max 10 children per container
        const siblingCountResult = await db('lists').where({ parent_id: parentId }).count('id as count').first();
        if (siblingCountResult.count >= LIMITS.MAX_CHILDREN_PER_LIST) {
            return res.status(403).json({ message: `Limit reached: Max ${LIMITS.MAX_CHILDREN_PER_LIST} sublists per list.` });
        }

        const tasksInParent = await db('tasks').where({ list_id: parentId }).first();
        if (tasksInParent) return res.status(409).json({ message: "Parent list contains tasks. Cannot add sublists." });
        validParentId = parentId;
    } else {
        // Limit Check: Max 20 Root Lists
        const rootCountResult = await db('lists').where({ owner_id: req.user.id, parent_id: null }).count('id as count').first();
        if (rootCountResult.count >= LIMITS.MAX_ROOT_LISTS) {
            return res.status(403).json({ message: `Limit reached: Max ${LIMITS.MAX_ROOT_LISTS} top-level lists.` });
        }
    }

    const [insertedId] = await db('lists').insert({ title, description, owner_id: req.user.id, parent_id: validParentId, pinned: false });
    const [newList] = await db('lists').where({ id: insertedId });
    res.status(201).json({ ...newList, pinned: false, ownerId: newList.owner_id, parentId: newList.parent_id, tasks: [], sharedWith: [], currentUserPermission: 'OWNER' });
  });

  const canAccessList = async (req, res, next) => {
      const { listId, id } = req.params;
      const effectiveListId = listId || id;
      const [list] = await db('lists').where('id', effectiveListId);
      if (!list) return res.status(404).json({ message: 'List not found' });
      
      const isOwner = list.owner_id === req.user.id;
      let permission = 'OWNER';
      
      if (!isOwner) {
          const share = await db('list_shares').where({ list_id: effectiveListId, user_id: req.user.id }).first();
          if (!share) return res.status(403).json({ message: 'Access denied' });
          permission = share.permission;
      }
      
      req.list = list;
      req.isOwner = isOwner;
      req.permission = permission;
      next();
  };

  router.put('/lists/:id', authenticate, canAccessList, async (req, res) => {
      // PERMISSION: Only owner can modify structure (Move list) or rename
      if (!req.isOwner) {
          return res.status(403).json({ message: 'Only owner can modify list settings.' });
      }

      const { title, description, parentId, pinned } = req.body;
      const updateData = {};
      
      const currentList = req.list;
      const oldParentId = currentList.parent_id;

      if(title !== undefined) updateData.title = title;
      if(description !== undefined) updateData.description = description;
      if(pinned !== undefined) updateData.pinned = pinned;
      
      if (parentId !== undefined) {
          if (parentId === null) {
              // Moving to Root -> Check Root Limits
              const rootCountResult = await db('lists').where({ owner_id: req.user.id, parent_id: null }).count('id as count').first();
              // Don't count self if already root (though technically move is a no-op then)
              if (currentList.parent_id !== null && rootCountResult.count >= LIMITS.MAX_ROOT_LISTS) {
                  return res.status(403).json({ message: `Limit reached: Max ${LIMITS.MAX_ROOT_LISTS} top-level lists.` });
              }
              updateData.parent_id = null;
          } else {
              const [parent] = await db('lists').where({ id: parentId, owner_id: req.user.id });
              if (!parent) return res.status(403).json({ message: "Target parent not found or access denied." });
              
              // Depth Check for Move
              if (parent.parent_id) {
                  const [grandparent] = await db('lists').where({ id: parent.parent_id });
                  if (grandparent && grandparent.parent_id) {
                       return res.status(409).json({ message: "Cannot move list here. Max nesting depth reached (3 tiers)." });
                  }
              }

              // Limit Check: Sibling Limit in target
              const siblingCountResult = await db('lists').where({ parent_id: parentId }).count('id as count').first();
              if (siblingCountResult.count >= LIMITS.MAX_CHILDREN_PER_LIST) {
                  return res.status(403).json({ message: `Target limit reached: Max ${LIMITS.MAX_CHILDREN_PER_LIST} sublists per list.` });
              }

              const parentTasks = await db('tasks').where({ list_id: parentId }).first();
              if (parentTasks) return res.status(409).json({ message: "Target list contains tasks. Cannot move list into it." });
              if (Number(parentId) === Number(req.params.id)) return res.status(400).json({ message: "Cannot move list into itself." });
              updateData.parent_id = parentId;
          }
      }

      if (Object.keys(updateData).length > 0) {
          await db('lists').where('id', req.params.id).update(updateData);
      }
      
      // LOGIC: Share Inheritance when moving lists
      if (parentId !== undefined && parentId !== oldParentId) {
          const listId = Number(req.params.id);
          
          if (parentId) {
              const currentShares = await db('list_shares').where({ list_id: listId });
              for (const share of currentShares) {
                  await db('list_shares').insert({ list_id: parentId, user_id: share.user_id, permission: share.permission }).onConflict().ignore();
              }
          }
          
          if (oldParentId) {
             const listShares = await db('list_shares').where({ list_id: listId });
             for (const share of listShares) {
                 const siblings = await db('lists').where({ parent_id: oldParentId }).whereNot({ id: listId });
                 const siblingIds = siblings.map(s => s.id);
                 
                 let hasSiblingAccess = false;
                 if (siblingIds.length > 0) {
                    const sharedSiblings = await db('list_shares')
                        .whereIn('list_id', siblingIds)
                        .where({ user_id: share.user_id });
                    if (sharedSiblings.length > 0) hasSiblingAccess = true;
                 }
                 
                 if (!hasSiblingAccess) {
                     await db('list_shares').where({ list_id: oldParentId, user_id: share.user_id }).del();
                 }
             }
          }
      }

      const [updated] = await db('lists').where('id', req.params.id);
      res.json(updated);
  });

  router.post('/lists/:id/merge', authenticate, canAccessList, async (req, res) => {
      if (!req.isOwner) return res.status(403).json({ message: 'Only owner can merge lists.' });
      
      const sourceId = Number(req.params.id);
      const { targetId } = req.body;
      
      if (!targetId) return res.status(400).json({ message: 'Target list ID required.' });
      if (Number(targetId) === sourceId) return res.status(400).json({ message: 'Cannot merge list into itself.' });

      const [targetList] = await db('lists').where({ id: targetId });
      if (!targetList) return res.status(404).json({ message: 'Target list not found.' });
      if (targetList.owner_id !== req.user.id) return res.status(403).json({ message: 'Cannot merge into a list you do not own.' });

      const targetChildren = await db('lists').where({ parent_id: targetId }).first();
      if (targetChildren) return res.status(409).json({ message: 'Target list contains sublists. Cannot merge tasks into it.' });

      try {
          await db.transaction(async (trx) => {
              // Tasks limit check for merge is tricky, skipping for simplicity or would require pre-check
              // Ideally: Count source tasks + target tasks. If > 50, reject.
              const sourceCount = await trx('tasks').where({ list_id: sourceId }).count('id as count').first();
              const targetCount = await trx('tasks').where({ list_id: targetId }).count('id as count').first();
              
              if ((sourceCount.count + targetCount.count) > LIMITS.MAX_TASKS_PER_LIST) {
                  throw new Error(`Merge would exceed limit of ${LIMITS.MAX_TASKS_PER_LIST} tasks per list.`);
              }

              await trx('tasks').where({ list_id: sourceId }).update({ list_id: targetId });
              await trx('lists').where({ id: sourceId }).del();
          });
          res.status(200).json({ message: 'Lists merged successfully.' });
      } catch (e) {
          console.error(e);
          res.status(500).json({ message: e.message || 'Merge failed.' });
      }
  });

  router.delete('/lists/:id', authenticate, canAccessList, async (req, res) => {
      if (!req.isOwner) return res.status(403).json({ message: 'Only owner can delete.' });
      await db('lists').where('id', req.params.id).del();
      res.status(204).send();
  });

  router.delete('/lists/:listId/tasks/completed', authenticate, canAccessList, async (req, res) => {
      if (req.permission === 'VIEW') return res.status(403).json({ message: "Read only access." });
      // Full Access/Owner can delete tasks. Modify access cannot delete tasks.
      if (req.permission === 'MODIFY' && !req.isOwner) return res.status(403).json({ message: "Modify access cannot delete tasks." });
      
      await db('tasks').where({ list_id: req.params.listId, completed: true }).del();
      res.status(204).send();
  });
  
  // Bulk status update
  router.put('/lists/:listId/tasks/bulk-status', authenticate, canAccessList, async (req, res) => {
      if (req.permission === 'VIEW') return res.status(403).json({ message: "Read only access." });

      const { completed } = req.body;
      if (typeof completed !== 'boolean') return res.status(400).json({ message: "Completed status required." });
      
      try {
          await db('tasks')
            .where({ list_id: req.params.listId })
            .update({ completed });
          res.status(200).send();
      } catch (e) {
          console.error(e);
          res.status(500).json({ message: "Bulk update failed." });
      }
  });

  router.post('/lists/:id/shares', authenticate, canAccessList, async (req, res) => {
      if (!req.isOwner) return res.status(403).json({ message: 'Only owner can share.' });
      const { userId, permission = 'FULL' } = req.body;
      
      if (req.list.parent_id) {
          await db('list_shares').insert({ list_id: req.list.parent_id, user_id: userId, permission }).onConflict().ignore();
      }

      const shareRecursively = async (listId) => {
          await db('list_shares').insert({ list_id: listId, user_id: userId, permission }).onConflict().ignore();
          const children = await db('lists').where({ parent_id: listId });
          for (const child of children) {
              await shareRecursively(child.id);
          }
      };

      await shareRecursively(req.params.id);
      res.status(201).send();
  });
  
  router.delete('/lists/:id/shares/:userId', authenticate, canAccessList, async (req, res) => {
      if (!req.isOwner) return res.status(403).json({ message: 'Only owner can unshare.' });
      
      const targetUserId = req.params.userId;
      const listId = req.params.id;

      const unshareRecursively = async (lid) => {
          await db('list_shares').where({ list_id: lid, user_id: targetUserId }).del();
          const children = await db('lists').where({ parent_id: lid });
          for (const child of children) {
              await unshareRecursively(child.id);
          }
      };
      
      await unshareRecursively(listId);

      if (req.list.parent_id) {
          const parentId = req.list.parent_id;
          const siblings = await db('lists').where({ parent_id: parentId }).whereNot({ id: listId });
          const siblingIds = siblings.map(s => s.id);
          
          let hasSiblingAccess = false;
          if (siblingIds.length > 0) {
               const sharedSiblings = await db('list_shares')
                  .whereIn('list_id', siblingIds)
                  .where({ user_id: targetUserId });
               if (sharedSiblings.length > 0) hasSiblingAccess = true;
          }
          
          if (!hasSiblingAccess) {
              await db('list_shares').where({ list_id: parentId, user_id: targetUserId }).del();
          }
      }

      res.status(204).send();
  });

  router.post('/lists/:listId/tasks', authenticate, canAccessList, async (req, res) => {
      if (req.permission === 'VIEW') return res.status(403).json({ message: "Read only access." });

      const children = await db('lists').where({ parent_id: req.params.listId }).first();
      if (children) return res.status(409).json({ message: "This list contains sublists. It cannot contain tasks." });

      const { description } = req.body;
      if (!description) return res.status(400).json({ message: "Description required." });
      
      // Limit Check: Tasks per List
      const listTaskCount = await db('tasks').where({ list_id: req.params.listId }).count('id as count').first();
      if (listTaskCount.count >= LIMITS.MAX_TASKS_PER_LIST) {
          return res.status(403).json({ message: `List limit reached: Max ${LIMITS.MAX_TASKS_PER_LIST} tasks per list.` });
      }

      // Limit Check: Total Tasks per User
      const totalTasksResult = await db('tasks')
          .join('lists', 'tasks.list_id', 'lists.id')
          .where('lists.owner_id', req.user.id)
          .count('tasks.id as count')
          .first();
      
      if (totalTasksResult.count >= LIMITS.MAX_TOTAL_TASKS_PER_USER) {
          return res.status(403).json({ message: `Account limit reached: Max ${LIMITS.MAX_TOTAL_TASKS_PER_USER} tasks total.` });
      }

      const [insertedId] = await db('tasks').insert({ 
          description, list_id: req.params.listId, importance: 0, pinned: false, completed: false, created_at: new Date() 
      });
      const [newTask] = await db('tasks').where('id', insertedId);
      res.status(201).json(normalizeTask(newTask));
  });
  
  router.post('/lists/:listId/tasks/bulk', authenticate, canAccessList, async (req, res) => {
      if (req.permission === 'VIEW') return res.status(403).json({ message: "Read only access." });

      const children = await db('lists').where({ parent_id: req.params.listId }).first();
      if (children) return res.status(409).json({ message: "List contains sublists. Cannot import tasks." });

      const { tasks } = req.body;
      
      // Limit Checks for Bulk Import
      const listTaskCount = await db('tasks').where({ list_id: req.params.listId }).count('id as count').first();
      if (listTaskCount.count + tasks.length > LIMITS.MAX_TASKS_PER_LIST) {
          return res.status(403).json({ message: `Import would exceed limit of ${LIMITS.MAX_TASKS_PER_LIST} tasks per list.` });
      }

      const totalTasksResult = await db('tasks')
          .join('lists', 'tasks.list_id', 'lists.id')
          .where('lists.owner_id', req.user.id)
          .count('tasks.id as count')
          .first();
      
      if (totalTasksResult.count + tasks.length > LIMITS.MAX_TOTAL_TASKS_PER_USER) {
          return res.status(403).json({ message: `Import would exceed account limit of ${LIMITS.MAX_TOTAL_TASKS_PER_USER} tasks.` });
      }

      const tasksToInsert = tasks.map(t => ({
          description: t.description || "Untitled",
          completed: !!t.completed,
          dueDate: t.dueDate || null,
          importance: t.importance || 0,
          list_id: req.params.listId,
          pinned: false,
          created_at: t.createdAt ? new Date(t.createdAt) : new Date()
      }));
      await db('tasks').insert(tasksToInsert);
      res.status(201).send();
  });
  
  router.post('/tasks/:taskId/copy', authenticate, async (req, res) => {
      const { taskId } = req.params;
      const { targetListId, move } = req.body;

      if (!targetListId) return res.status(400).json({message: "Target list required"});

      const [task] = await db('tasks').where('id', taskId);
      if(!task) return res.status(404).json({message: 'Task not found'});
      
      // Source Check
      const [sourceList] = await db('lists').where('id', task.list_id);
      let sourcePermission = 'OWNER';
      if (sourceList.owner_id !== req.user.id) {
          const share = await db('list_shares').where({ list_id: task.list_id, user_id: req.user.id }).first();
          if (!share) return res.status(403).json({ message: 'Source access denied' });
          sourcePermission = share.permission;
      }
      
      // If moving, need delete permission on source
      if (move) {
          if (sourcePermission === 'VIEW') return res.status(403).json({ message: "Cannot move from View Only list." });
          if (sourcePermission === 'MODIFY' && sourceList.owner_id !== req.user.id) return res.status(403).json({ message: "Modify access cannot delete tasks (move)." });
      }

      // Target Check
      const [targetList] = await db('lists').where('id', targetListId);
      if(!targetList) return res.status(404).json({message: 'Target list not found'});
      
      let targetPermission = 'OWNER';
      if (targetList.owner_id !== req.user.id) {
          const share = await db('list_shares').where({ list_id: targetListId, user_id: req.user.id }).first();
          if (!share) return res.status(403).json({ message: 'Target access denied' });
          targetPermission = share.permission;
      }
      
      if (targetPermission === 'VIEW') return res.status(403).json({ message: "Cannot copy/move to View Only list." });

      const targetChildren = await db('lists').where({ parent_id: targetListId }).first();
      if (targetChildren) return res.status(409).json({ message: "Target list contains sublists. Cannot add tasks." });

      // Limit Checks for Copy/Move
      // 1. Target List Limit
      const targetListCount = await db('tasks').where({ list_id: targetListId }).count('id as count').first();
      if (targetListCount.count >= LIMITS.MAX_TASKS_PER_LIST) {
          return res.status(403).json({ message: `Target list full. Max ${LIMITS.MAX_TASKS_PER_LIST} tasks per list.` });
      }

      // 2. Account Total Limit (Only for Copy, Move doesn't increase total)
      if (!move) {
          const totalTasksResult = await db('tasks')
            .join('lists', 'tasks.list_id', 'lists.id')
            .where('lists.owner_id', req.user.id)
            .count('tasks.id as count')
            .first();
          
          if (totalTasksResult.count >= LIMITS.MAX_TOTAL_TASKS_PER_USER) {
              return res.status(403).json({ message: `Account limit reached: Max ${LIMITS.MAX_TOTAL_TASKS_PER_USER} tasks total.` });
          }
      }

      if (move) {
          await db('tasks').where('id', taskId).update({ list_id: targetListId });
      } else {
          await db('tasks').insert({
              description: task.description,
              completed: task.completed,
              dueDate: task.dueDate,
              created_at: new Date(),
              importance: task.importance,
              list_id: targetListId,
              pinned: task.pinned
          });
      }
      res.status(200).send();
  });

  router.put('/tasks/:taskId', authenticate, async (req, res) => {
    const { taskId } = req.params;
    const { description, completed, dueDate, importance, dependsOn, pinned, focused } = req.body;
    
    const [task] = await db('tasks').where('id', taskId);
    if(!task) return res.status(404).json({message: 'Task not found'});
    
    const [list] = await db('lists').where('id', task.list_id);
    let permission = 'OWNER';
    if (list.owner_id !== req.user.id) {
        const share = await db('list_shares').where({ list_id: task.list_id, user_id: req.user.id }).first();
        if (!share) return res.status(403).json({ message: 'Access denied' });
        permission = share.permission;
    }

    if (permission === 'VIEW') return res.status(403).json({ message: "Read only access." });

    if (dependsOn !== undefined && dependsOn !== null) {
        if (Number(dependsOn) === Number(taskId)) return res.status(409).json({ message: "Self-dependency not allowed." });
        const [depTask] = await db('tasks').where('id', dependsOn);
        if (!depTask || depTask.list_id !== task.list_id) return res.status(409).json({ message: "Invalid dependency." });
        
        // Check depth limit
        const withinLimit = await checkDependencyDepth(db, Number(dependsOn));
        if (!withinLimit) {
            return res.status(400).json({ message: "Dependency limit is 5 levels deep." });
        }
    }
    
    // Focused Logic
    if (focused === true) {
        if (task.completed || completed === true) {
            return res.status(400).json({ message: "Cannot focus a completed task." });
        }
        
        const ownedLists = db('lists').where('owner_id', req.user.id).select('id');
        const sharedLists = db('list_shares').where('user_id', req.user.id).select('list_id as id');
        
        const focusedCountResult = await db('tasks')
            .whereIn('list_id', db.unionAll([ownedLists, sharedLists]))
            .andWhere('focused', true)
            .count('id as count')
            .first();
            
        if (focusedCountResult && focusedCountResult.count >= 100) {
            return res.status(400).json({ message: "Focused list limit reached (100 tasks)." });
        }
    }

    if (completed === true && (dependsOn || task.dependsOn)) {
        const depId = dependsOn !== undefined ? dependsOn : task.dependsOn;
        if(depId) {
            const [dep] = await db('tasks').where('id', depId);
            if(dep && !dep.completed) return res.status(409).json({message: "Dependency incomplete."});
        }
    }

    const updatePayload = { description, completed, dueDate, importance, dependsOn, pinned, focused };
    
    // If completing, remove focus
    if (completed === true) {
        updatePayload.focused = false;
    }

    Object.keys(updatePayload).forEach(key => updatePayload[key] === undefined && delete updatePayload[key]);
    
    await db('tasks').where('id', taskId).update(updatePayload);
    const [updated] = await db('tasks').where('id', taskId);
    res.json(normalizeTask(updated));
  });

  router.delete('/tasks/:taskId', authenticate, async (req, res) => {
      const [task] = await db('tasks').where('id', req.params.taskId);
      if(!task) return res.status(404).json({message: 'Not found'});
      
      const [list] = await db('lists').where('id', task.list_id);
      let permission = 'OWNER';
      if (list.owner_id !== req.user.id) {
          const share = await db('list_shares').where({ list_id: list.id, user_id: req.user.id }).first();
          if (!share) return res.status(403).json({ message: 'Access denied' });
          permission = share.permission;
      }
      
      if (permission === 'VIEW') return res.status(403).json({ message: "Read only access." });
      if (permission === 'MODIFY' && !list.owner_id) return res.status(403).json({ message: "Modify access cannot delete tasks." });

      await db('tasks').where('id', req.params.taskId).del();
      res.status(204).send();
  });

  return router;
}
