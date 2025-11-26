
import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-key-that-should-be-in-an-env-file';
const DEFAULT_SESSION_TIMEOUT = process.env.SESSION_TIMEOUT || '7d';
const SALT_ROUNDS = 10;

// --- Utility Functions ---
const logActivity = (db, level, message) => {
    // Fire-and-forget logging
    db('activity_log').insert({ level, message })
        .then(() => {
            // Log Rotation: Delete logs older than 30 days to keep DB size manageable
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
        createdAt: task.created_at, // Map DB column to frontend property
        // Ensure other fields are passed through correctly
        completed: Boolean(task.completed),
        pinned: Boolean(task.pinned)
    };
};

// --- Authentication Middleware ---
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

  // --- Public Routes (Authentication & Setup) ---
  router.get('/users/any-exist', async (req, res) => {
      const users = await db('users').select('id').limit(1);
      res.json({ usersExist: users.length > 0 });
  });

  router.post('/users/register', async (req, res) => {
      const { username, password } = req.body;
      const users = await db('users').select('id').limit(1);
      
      const role = users.length === 0 ? 'ADMIN' : 'USER';

      if (role === 'USER') {
          return res.status(403).json({ message: 'Registration is closed. An admin must create new users.' });
      }

      if (!username || !password) {
        return res.status(400).json({ message: 'Username and password are required.' });
      }
      if (password.length < 6) {
          return res.status(400).json({ message: 'Password must be at least 6 characters long.' });
      }

      const password_hash = await bcrypt.hash(password, SALT_ROUNDS);
      const [userId] = await db('users').insert({ username, password_hash, role });

      logActivity(db, 'INFO', `Initial admin user '${username}' created.`);

      const token = jwt.sign({ userId }, JWT_SECRET, { expiresIn: DEFAULT_SESSION_TIMEOUT });
      res.status(201).json({ token, user: { id: userId, username, role } });
  });

  router.post('/users/login', async (req, res) => {
      const { username, password } = req.body;
      const [user] = await db('users').where('username', username);
      if (user && await bcrypt.compare(password, user.password_hash)) {
          // Use user preference or default
          const timeout = user.session_timeout || DEFAULT_SESSION_TIMEOUT;
          const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: timeout });
          
          logActivity(db, 'INFO', `User '${username}' logged in successfully.`);
          res.json({ 
              token, 
              user: { 
                  id: user.id, 
                  username: user.username, 
                  role: user.role, 
                  sessionTimeout: user.session_timeout 
              } 
          });
      } else {
          logActivity(db, 'WARN', `Failed login attempt for user '${username}'.`);
          res.status(401).json({ message: 'Invalid credentials.' });
      }
  });

  // --- Protected Routes ---
  router.get('/users/me', authenticate, (req, res) => {
      res.json({ 
          id: req.user.id, 
          username: req.user.username, 
          role: req.user.role, 
          sessionTimeout: req.user.session_timeout 
      });
  });
  
  // Update User Credentials (Self)
  router.put('/users/me', authenticate, async (req, res) => {
      const { username, password, currentPassword, sessionTimeout } = req.body;
      
      // Verify current password
      const [currentUser] = await db('users').where('id', req.user.id);
      if (!await bcrypt.compare(currentPassword, currentUser.password_hash)) {
          return res.status(401).json({ message: 'Current password incorrect.' });
      }

      const updateData = {};
      if (username && username !== currentUser.username) {
          const [existing] = await db('users').where({ username });
          if (existing) return res.status(409).json({ message: 'Username already taken.' });
          updateData.username = username;
      }
      if (password) {
          if (password.length < 6) return res.status(400).json({ message: 'New password must be at least 6 characters.' });
          updateData.password_hash = await bcrypt.hash(password, SALT_ROUNDS);
      }
      if (sessionTimeout !== undefined) {
          updateData.session_timeout = sessionTimeout;
      }

      if (Object.keys(updateData).length > 0) {
          await db('users').where('id', req.user.id).update(updateData);
          logActivity(db, 'INFO', `User '${currentUser.username}' updated their profile.`);
      }
      
      const [updatedUser] = await db('users').where('id', req.user.id).select('id', 'username', 'role', 'session_timeout');
      res.json({
          id: updatedUser.id,
          username: updatedUser.username,
          role: updatedUser.role,
          sessionTimeout: updatedUser.session_timeout
      });
  });
  
  router.get('/users', authenticate, async (req, res) => {
      const users = await db('users').select('id', 'username', 'role');
      res.json(users);
  });

  // --- Admin Routes ---
  router.post('/admin/users', authenticate, adminOnly, async (req, res) => {
      const { username, password } = req.body;
      if (!username || !password) return res.status(400).json({ message: 'Username and password required.' });
      if (password.length < 6) return res.status(400).json({ message: 'Password must be at least 6 characters long.' });

      const [existingUser] = await db('users').where({ username });
      if (existingUser) return res.status(409).json({ message: 'Username already exists.' });

      const password_hash = await bcrypt.hash(password, SALT_ROUNDS);
      const [userId] = await db('users').insert({ username, password_hash, role: 'USER' });
      const [newUser] = await db('users').where({ id: userId }).select('id', 'username', 'role');
      
      logActivity(db, 'INFO', `Admin '${req.user.username}' created user '${username}'.`);
      res.status(201).json(newUser);
  });
  
  router.delete('/admin/users/:id', authenticate, adminOnly, async (req, res) => {
      const { id } = req.params;
      if (Number(id) === req.user.id) return res.status(400).json({ message: 'Cannot delete your own account.' });

      const [userToDelete] = await db('users').where({ id });
      if (!userToDelete) return res.status(404).json({ message: 'User not found.' });

      await db('users').where({ id }).del();
      logActivity(db, 'WARN', `Admin '${req.user.username}' deleted user '${userToDelete.username}'.`);
      res.status(204).send();
  });

  // Reset User Password (Admin)
  router.put('/admin/users/:id/password', authenticate, adminOnly, async (req, res) => {
      const { id } = req.params;
      const { newPassword } = req.body;

      if (!newPassword || newPassword.length < 6) {
          return res.status(400).json({ message: 'Password must be at least 6 characters.' });
      }

      const [userToUpdate] = await db('users').where({ id });
      if (!userToUpdate) return res.status(404).json({ message: 'User not found.' });

      const password_hash = await bcrypt.hash(newPassword, SALT_ROUNDS);
      await db('users').where({ id }).update({ password_hash });

      logActivity(db, 'WARN', `Admin '${req.user.username}' reset password for user '${userToUpdate.username}'.`);
      res.status(200).json({ message: 'Password updated successfully.' });
  });
  
  router.get('/admin/logs', authenticate, adminOnly, async (req, res) => {
      const logs = await db('activity_log').orderBy('timestamp', 'desc').limit(100);
      res.json(logs);
  });


  // Get lists owned by or shared with the current user
  router.get('/lists', authenticate, async (req, res) => {
      const ownedLists = await db('lists').where('owner_id', req.user.id);
      const sharedListIds = await db('list_shares').where('user_id', req.user.id).pluck('list_id');
      const sharedLists = await db('lists').whereIn('id', sharedListIds);
      
      const allUserLists = [...ownedLists, ...sharedLists];
      const allListIds = allUserLists.map(l => l.id);

      if (allListIds.length === 0) {
        return res.json([]);
      }

      const [tasks, shares, users] = await Promise.all([
          db('tasks').whereIn('list_id', allListIds),
          db('list_shares').whereIn('list_id', allListIds),
          db('users').select('id', 'username')
      ]);
      
      const usersById = users.reduce((acc, u) => ({...acc, [u.id]: u }), {});
      
      const listsWithDetails = allUserLists.map(list => {
          const listShares = shares.filter(s => s.list_id === list.id);
          const rawTasks = tasks.filter(task => task.list_id === list.id).sort((a,b) => a.id - b.id);
          return {
              ...list,
              ownerId: list.owner_id,
              tasks: rawTasks.map(normalizeTask), // Normalize tasks here
              sharedWith: listShares.map(s => usersById[s.user_id]).filter(Boolean)
          };
      });
      res.json(listsWithDetails);
  });
  
  router.post('/lists', authenticate, async (req, res) => {
    const { title, description } = req.body;
    if (!title || title.length > 100) return res.status(400).json({ message: "Title is required and must be under 100 characters." });
    
    const [insertedId] = await db('lists').insert({ title, description, owner_id: req.user.id });
    const [newList] = await db('lists').where({ id: insertedId, owner_id: req.user.id });
    res.status(201).json({ ...newList, ownerId: newList.owner_id, tasks: [], sharedWith: [] });
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

  router.delete('/lists/:id', authenticate, canAccessList, async (req, res) => {
      if (!req.isOwner) return res.status(403).json({ message: 'Only the owner can delete a list.' });
      await db('lists').where('id', req.params.id).del();
      res.status(204).send();
  });
  
  router.delete('/lists/:listId/tasks/completed', authenticate, canAccessList, async (req, res) => {
      await db('tasks').where({ list_id: req.params.listId, completed: true }).del();
      res.status(204).send();
  });

  router.post('/lists/:id/shares', authenticate, canAccessList, async (req, res) => {
      if (!req.isOwner) return res.status(403).json({ message: 'Only the owner can share a list.' });
      const { userId } = req.body;
      if (userId === req.user.id) return res.status(400).json({ message: 'Cannot share a list with yourself.'});
      await db('list_shares').insert({ list_id: req.params.id, user_id: userId }).onConflict().ignore();
      res.status(201).send();
  });
  
  router.delete('/lists/:id/shares/:userId', authenticate, canAccessList, async (req, res) => {
      if (!req.isOwner) return res.status(403).json({ message: 'Only the owner can manage sharing.' });
      await db('list_shares').where({ list_id: req.params.id, user_id: req.params.userId }).del();
      res.status(204).send();
  });

  router.post('/lists/:listId/tasks', authenticate, canAccessList, async (req, res) => {
      const { description } = req.body;
      if (!description || description.length > 500) {
          return res.status(400).json({ message: "Description is required and must be under 500 characters." });
      }
      const newTaskData = { 
          description, 
          list_id: req.params.listId, 
          importance: 0, 
          pinned: false, 
          completed: false,
          created_at: new Date() // Explicitly set created_at from Node
      };
      const [insertedId] = await db('tasks').insert(newTaskData);
      const [newTask] = await db('tasks').where('id', insertedId);
      res.status(201).json(normalizeTask(newTask)); // Normalize result
  });
  
  // Bulk add tasks for Import feature
  router.post('/lists/:listId/tasks/bulk', authenticate, canAccessList, async (req, res) => {
      const { tasks } = req.body;
      if (!Array.isArray(tasks)) {
          return res.status(400).json({ message: 'Tasks must be an array' });
      }
      
      const tasksToInsert = tasks.map(t => ({
          description: t.description ? t.description.substring(0, 500) : "Untitled Task",
          completed: !!t.completed,
          dueDate: t.dueDate || null,
          importance: t.importance || 0,
          list_id: req.params.listId,
          pinned: false,
          created_at: t.createdAt ? new Date(t.createdAt) : new Date()
      }));

      try {
          // Use transaction for bulk insert if supported or just standard insert
          await db('tasks').insert(tasksToInsert);
          res.status(201).send();
      } catch (err) {
          console.error("Bulk insert failed:", err);
          res.status(500).json({ message: 'Failed to import tasks' });
      }
  });
  
  router.put('/tasks/:taskId', authenticate, async (req, res) => {
    const { taskId } = req.params;
    const [task] = await db('tasks').where('id', taskId);
    if (!task) return res.status(404).json({ message: 'Task not found' });
    
    const [list] = await db('lists').where('id', task.list_id);
    if (!list) return res.status(404).json({ message: 'Parent list not found' });
    const isOwner = list.owner_id === req.user.id;
    const isShared = await db('list_shares').where({ list_id: task.list_id, user_id: req.user.id }).first();
    if (!isOwner && !isShared) return res.status(403).json({ message: 'Access denied' });
    
    const { description, completed, dueDate, importance, dependsOn, pinned } = req.body;

    if (description !== undefined && description.length > 500) {
        return res.status(400).json({ message: "Description must be under 500 characters." });
    }

    if (dependsOn !== undefined) {
      if (dependsOn !== null && Number(dependsOn) === Number(taskId)) return res.status(409).json({ message: "A task cannot depend on itself." });
      if (dependsOn !== null) {
          const [dependencyTask] = await db('tasks').where('id', dependsOn);
          if (!dependencyTask) return res.status(404).json({ message: 'Dependency task not found.' });
          if (task.list_id !== dependencyTask.list_id) return res.status(409).json({ message: 'Tasks must be in the same list to set a dependency.' });
          if (dependencyTask.dependsOn === Number(taskId)) return res.status(409).json({ message: 'Circular dependency detected.' });
      }
    }
    if (completed === true) {
      const dependencyId = dependsOn !== undefined ? dependsOn : task.dependsOn;
      if (dependencyId) {
          const [dependency] = await db('tasks').where('id', dependencyId).select('completed');
          if (dependency && !dependency.completed) return res.status(409).json({ message: 'Cannot complete a task while its dependency is incomplete.' });
      }
    }
    const updatePayload = { description, completed, dueDate, importance, dependsOn, pinned };
    Object.keys(updatePayload).forEach(key => updatePayload[key] === undefined && delete updatePayload[key]);
    await db('tasks').where('id', taskId).update(updatePayload);
    const [updatedTask] = await db('tasks').where('id', taskId);
    res.json(normalizeTask(updatedTask)); // Normalize result
  });

  router.delete('/tasks/:taskId', authenticate, async (req, res) => {
      const { taskId } = req.params;
      const [task] = await db('tasks').where('id', taskId);
      if (!task) return res.status(404).json({ message: 'Task not found' });
      
      const [list] = await db('lists').where('id', task.list_id);
      if (!list) return res.status(404).json({ message: 'Parent list not found' });
      const isOwner = list.owner_id === req.user.id;
      const isShared = await db('list_shares').where({ list_id: task.list_id, user_id: req.user.id }).first();
      if (!isOwner && !isShared) return res.status(403).json({ message: 'Access denied' });
      
      await db('tasks').where('id', taskId).del();
      res.status(204).send();
  });

  return router;
}
