
import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { seedDatabase } from './database.js'; // Import seeding function

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-key-that-should-be-in-an-env-file';
const DEFAULT_SESSION_TIMEOUT = process.env.SESSION_TIMEOUT || '7d';
const SALT_ROUNDS = 10;

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
        pinned: Boolean(task.pinned)
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
      const users = await db('users').select('id').limit(1);
      const role = users.length === 0 ? 'ADMIN' : 'USER';
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

  router.post('/admin/maintenance', authenticate, adminOnly, async (req, res) => {
      const { action } = req.body;
      try {
          if (action === 'vacuum') {
              await db.raw('VACUUM');
              logActivity(db, 'INFO', 'Admin executed database VACUUM.');
              return res.json({ message: 'Database optimized (VACUUM).' });
          } 
          else if (action === 'prune') {
              // Remove tasks belonging to non-existent lists
              await db('tasks')
                .whereNotIn('list_id', db.select('id').from('lists'))
                .del();
              logActivity(db, 'INFO', 'Admin pruned orphaned tasks.');
              return res.json({ message: 'Orphaned tasks pruned.' });
          } 
          else if (action === 'purge_all') {
              // Delete all lists and tasks. Users remain.
              await db('tasks').del();
              await db('list_shares').del();
              await db('lists').del();
              await db('sqlite_sequence').whereIn('name', ['tasks', 'lists']).update({ seq: 0 });
              
              logActivity(db, 'WARN', 'Admin PURGED ALL DATA.');
              return res.json({ message: 'All lists and tasks deleted.' });
          }
          else if (action === 'reset_defaults') {
              // Wipe data then re-seed
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
      // Get all lists user has access to
      const ownedLists = await db('lists').where('owner_id', req.user.id);
      const sharedListIds = await db('list_shares').where('user_id', req.user.id).pluck('list_id');
      const sharedLists = await db('lists').whereIn('id', sharedListIds);
      
      const allUserLists = [...ownedLists, ...sharedLists];
      // Deduplicate
      const uniqueLists = Array.from(new Map(allUserLists.map(list => [list.id, list])).values());
      const allListIds = uniqueLists.map(l => l.id);

      if (allListIds.length === 0) return res.json([]);

      const [tasks, shares, users] = await Promise.all([
          db('tasks').whereIn('list_id', allListIds),
          db('list_shares').whereIn('list_id', allListIds),
          db('users').select('id', 'username')
      ]);
      
      const usersById = users.reduce((acc, u) => ({...acc, [u.id]: u }), {});
      
      const listsWithDetails = uniqueLists.map(list => {
          const listShares = shares.filter(s => s.list_id === list.id);
          const rawTasks = tasks.filter(task => task.list_id === list.id).sort((a,b) => a.id - b.id);
          return {
              ...list,
              ownerId: list.owner_id,
              parentId: list.parent_id,
              tasks: rawTasks.map(normalizeTask),
              sharedWith: listShares.map(s => usersById[s.user_id]).filter(Boolean)
          };
      });
      res.json(listsWithDetails);
  });
  
  router.post('/lists', authenticate, async (req, res) => {
    const { title, description, parentId } = req.body;
    if (!title) return res.status(400).json({ message: "Title required." });
    
    let validParentId = null;
    if (parentId) {
        // Ensure parent exists and we have access
        const [parent] = await db('lists').where({ id: parentId, owner_id: req.user.id });
        if (!parent) return res.status(403).json({ message: "Cannot create sublist in a list you don't own." });
        
        // Rule: Sublist cannot contain another list (Max depth 1: Root -> Master -> Sublist)
        if (parent.parent_id) return res.status(409).json({ message: "Max nesting depth reached. Sublists cannot have sublists." });

        // Rule: Parent cannot have tasks if it has children.
        const tasksInParent = await db('tasks').where({ list_id: parentId }).first();
        if (tasksInParent) return res.status(409).json({ message: "Parent list contains tasks. Cannot add sublists." });
        
        validParentId = parentId;
    }

    const [insertedId] = await db('lists').insert({ title, description, owner_id: req.user.id, parent_id: validParentId });
    const [newList] = await db('lists').where({ id: insertedId });
    res.status(201).json({ ...newList, ownerId: newList.owner_id, parentId: newList.parent_id, tasks: [], sharedWith: [] });
  });

  const canAccessList = async (req, res, next) => {
      const { listId, id } = req.params;
      const effectiveListId = listId || id;
      const [list] = await db('lists').where('id', effectiveListId);
      if (!list) return res.status(404).json({ message: 'List not found' });
      const isOwner = list.owner_id === req.user.id;
      const isShared = await db('list_shares').where({ list_id: effectiveListId, user_id: req.user.id }).first();
      if (!isOwner && !isShared) return res.status(403).json({ message: 'Access denied' });
      req.list = list;
      req.isOwner = isOwner;
      next();
  };

  router.put('/lists/:id', authenticate, canAccessList, async (req, res) => {
      const { title, description, parentId } = req.body;
      const updateData = {};
      if(title !== undefined) updateData.title = title;
      if(description !== undefined) updateData.description = description;
      
      if (parentId !== undefined) {
          if (parentId === null) {
              updateData.parent_id = null; // Move to Root
          } else {
              // Can only move to a parent I own
              const [parent] = await db('lists').where({ id: parentId, owner_id: req.user.id });
              if (!parent) return res.status(403).json({ message: "Target parent not found or access denied." });
              
              // Rule: Target parent cannot be a sublist (Depth Limit)
              if (parent.parent_id) return res.status(409).json({ message: "Cannot move list into a sublist (Max depth 2 tiers)." });

              // Rule: Target parent cannot contain tasks
              const parentTasks = await db('tasks').where({ list_id: parentId }).first();
              if (parentTasks) return res.status(409).json({ message: "Target list contains tasks. Cannot move list into it." });
              
              // Validate: I cannot move a list into one of its own children
              if (Number(parentId) === Number(req.params.id)) return res.status(400).json({ message: "Cannot move list into itself." });

              updateData.parent_id = parentId;
          }
      }

      if (Object.keys(updateData).length > 0) {
          await db('lists').where('id', req.params.id).update(updateData);
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

      // Check Target Access & Validity
      const [targetList] = await db('lists').where({ id: targetId });
      if (!targetList) return res.status(404).json({ message: 'Target list not found.' });
      if (targetList.owner_id !== req.user.id) return res.status(403).json({ message: 'Cannot merge into a list you do not own.' });

      // Rule: Target List cannot have sublists (Must be able to accept tasks)
      const targetChildren = await db('lists').where({ parent_id: targetId }).first();
      if (targetChildren) return res.status(409).json({ message: 'Target list contains sublists. Cannot merge tasks into it.' });

      // Perform Merge in Transaction
      try {
          await db.transaction(async (trx) => {
              // 1. Move tasks
              await trx('tasks').where({ list_id: sourceId }).update({ list_id: targetId });
              
              // 2. Delete source list (Cascade should handle shares/etc, but explicit delete is safe)
              await trx('lists').where({ id: sourceId }).del();
          });
          res.status(200).json({ message: 'Lists merged successfully.' });
      } catch (e) {
          console.error(e);
          res.status(500).json({ message: 'Merge failed.' });
      }
  });

  router.delete('/lists/:id', authenticate, canAccessList, async (req, res) => {
      if (!req.isOwner) return res.status(403).json({ message: 'Only owner can delete.' });
      await db('lists').where('id', req.params.id).del();
      res.status(204).send();
  });

  router.delete('/lists/:listId/tasks/completed', authenticate, canAccessList, async (req, res) => {
      await db('tasks').where({ list_id: req.params.listId, completed: true }).del();
      res.status(204).send();
  });

  router.post('/lists/:id/shares', authenticate, canAccessList, async (req, res) => {
      if (!req.isOwner) return res.status(403).json({ message: 'Only owner can share.' });
      const { userId } = req.body;
      
      // RECURSIVE SHARING
      const shareRecursively = async (listId) => {
          await db('list_shares').insert({ list_id: listId, user_id: userId }).onConflict().ignore();
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
      
      // RECURSIVE UNSHARING
      const unshareRecursively = async (listId) => {
          await db('list_shares').where({ list_id: listId, user_id: req.params.userId }).del();
          const children = await db('lists').where({ parent_id: listId });
          for (const child of children) {
              await unshareRecursively(child.id);
          }
      };
      
      await unshareRecursively(req.params.id);
      res.status(204).send();
  });

  router.post('/lists/:listId/tasks', authenticate, canAccessList, async (req, res) => {
      // Validate: List cannot have tasks if it has children
      const children = await db('lists').where({ parent_id: req.params.listId }).first();
      if (children) return res.status(409).json({ message: "This list contains sublists. It cannot contain tasks." });

      const { description } = req.body;
      if (!description) return res.status(400).json({ message: "Description required." });
      
      const [insertedId] = await db('tasks').insert({ 
          description, list_id: req.params.listId, importance: 0, pinned: false, completed: false, created_at: new Date() 
      });
      const [newTask] = await db('tasks').where('id', insertedId);
      res.status(201).json(normalizeTask(newTask));
  });
  
  router.post('/lists/:listId/tasks/bulk', authenticate, canAccessList, async (req, res) => {
      const children = await db('lists').where({ parent_id: req.params.listId }).first();
      if (children) return res.status(409).json({ message: "List contains sublists. Cannot import tasks." });

      const { tasks } = req.body;
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
  
  router.put('/tasks/:taskId', authenticate, async (req, res) => {
    const { taskId } = req.params;
    const { description, completed, dueDate, importance, dependsOn, pinned } = req.body;
    
    // Auth check
    const [task] = await db('tasks').where('id', taskId);
    if(!task) return res.status(404).json({message: 'Task not found'});
    
    // Check list access
    const [list] = await db('lists').where('id', task.list_id);
    const isOwner = list.owner_id === req.user.id;
    const isShared = await db('list_shares').where({ list_id: task.list_id, user_id: req.user.id }).first();
    if (!isOwner && !isShared) return res.status(403).json({ message: 'Access denied' });

    // Dependencies Logic
    if (dependsOn !== undefined && dependsOn !== null) {
        if (Number(dependsOn) === Number(taskId)) return res.status(409).json({ message: "Self-dependency not allowed." });
        const [depTask] = await db('tasks').where('id', dependsOn);
        if (!depTask || depTask.list_id !== task.list_id) return res.status(409).json({ message: "Invalid dependency." });
    }
    if (completed === true && (dependsOn || task.dependsOn)) {
        const depId = dependsOn !== undefined ? dependsOn : task.dependsOn;
        if(depId) {
            const [dep] = await db('tasks').where('id', depId);
            if(dep && !dep.completed) return res.status(409).json({message: "Dependency incomplete."});
        }
    }

    const updatePayload = { description, completed, dueDate, importance, dependsOn, pinned };
    Object.keys(updatePayload).forEach(key => updatePayload[key] === undefined && delete updatePayload[key]);
    
    await db('tasks').where('id', taskId).update(updatePayload);
    const [updated] = await db('tasks').where('id', taskId);
    res.json(normalizeTask(updated));
  });

  router.delete('/tasks/:taskId', authenticate, async (req, res) => {
      const [task] = await db('tasks').where('id', req.params.taskId);
      if(!task) return res.status(404).json({message: 'Not found'});
      
      const [list] = await db('lists').where('id', task.list_id);
      const isOwner = list.owner_id === req.user.id;
      const isShared = await db('list_shares').where({ list_id: list.id, user_id: req.user.id }).first();
      if (!isOwner && !isShared) return res.status(403).json({ message: 'Access denied' });

      await db('tasks').where('id', req.params.taskId).del();
      res.status(204).send();
  });

  return router;
}
