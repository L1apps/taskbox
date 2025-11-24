
import express from 'express';

// This function creates and configures the API router.
// It accepts the database connection as a dependency.
export function createApiRouter(db) {
  const router = express.Router();

  // Health check endpoint to verify server and database connectivity
  router.get('/health', async (req, res) => {
    try {
      // Performs a simple query to ensure the database connection is alive
      await db.raw('SELECT 1');
      res.status(200).json({ status: 'ok', database: 'connected' });
    } catch (dbError) {
      console.error('Health check failed to connect to database:', dbError);
      // 503 Service Unavailable is an appropriate status code here
      res.status(503).json({ status: 'error', database: 'disconnected' });
    }
  });

  // Get all lists with their tasks
  router.get('/lists', async (req, res) => {
    try {
      const lists = await db('lists').select('*').orderBy('id');
      const tasks = await db('tasks').select('*');
      const listsWithTasks = lists.map(list => ({
        ...list,
        tasks: tasks.filter(task => task.list_id === list.id)
      }));
      res.json(listsWithTasks);
    } catch (err) {
      console.error('Error in GET /api/lists:', err);
      res.status(500).json({ message: 'An internal server error occurred while fetching lists.' });
    }
  });

  // Create a new list
  router.post('/lists', async (req, res) => {
    try {
      const { title, description } = req.body;
      if (!title || typeof title !== 'string' || title.trim() === '') {
        return res.status(400).json({ message: 'Title is required and must be a non-empty string.' });
      }
      const [insertedId] = await db('lists').insert({ title: title.trim(), description });
      const [newList] = await db('lists').where('id', insertedId).select('*');
      res.status(201).json({ ...newList, tasks: [] });
    } catch (err) {
      console.error('Error in POST /api/lists:', err);
      res.status(500).json({ message: 'An internal server error occurred while creating the list.' });
    }
  });

  // Delete a list
  router.delete('/lists/:id', async (req, res) => {
    try {
      const { id } = req.params;
      await db('tasks').where('list_id', id).del();
      const count = await db('lists').where('id', id).del();
      if (count > 0) {
        res.status(204).send();
      } else {
        res.status(404).json({ message: 'List not found' });
      }
    } catch (err) {
      console.error(`Error in DELETE /api/lists/${req.params.id}:`, err);
      res.status(500).json({ message: 'An internal server error occurred while deleting the list.' });
    }
  });

  // Add a task to a list
  router.post('/lists/:listId/tasks', async (req, res) => {
    try {
      const { listId } = req.params;
      const { description } = req.body;
      if (!description || typeof description !== 'string' || description.trim() === '') {
        return res.status(400).json({ message: 'Description is required and must be a non-empty string.' });
      }
      const newTaskData = {
        description: description.trim(),
        completed: false,
        dueDate: null,
        importance: 1,
        dependsOn: null,
        list_id: parseInt(listId, 10)
      };
      const [insertedId] = await db('tasks').insert(newTaskData);
      const [newTask] = await db('tasks').where('id', insertedId).select('*');
      res.status(201).json(newTask);
    } catch (err) {
      console.error(`Error in POST /api/lists/${req.params.listId}/tasks:`, err);
      res.status(500).json({ message: 'An internal server error occurred while adding the task.' });
    }
  });

  // Bulk add tasks to a list
  router.post('/lists/:listId/tasks/bulk', async (req, res) => {
    const { listId } = req.params;
    const { tasks } = req.body;

    if (!Array.isArray(tasks) || tasks.length === 0) {
      return res.status(400).json({ message: 'Request body must be an array of tasks.' });
    }

    try {
      const tasksToInsert = tasks.map(task => ({
        description: task.description,
        completed: !!task.completed,
        dueDate: task.dueDate || null,
        importance: typeof task.importance === 'number' ? Math.max(0, Math.min(5, task.importance)) : 1,
        dependsOn: null, // Dependencies are not supported via bulk import
        list_id: parseInt(listId, 10),
      }));

      const validTasks = tasksToInsert.filter(t => t.description && typeof t.description === 'string' && t.description.trim() !== '');
      if (validTasks.length === 0) {
        return res.status(400).json({ message: 'No valid tasks with descriptions provided.' });
      }

      // Using .returning('*') which is supported by knex with sqlite3 driver
      const newTasks = await db('tasks').insert(validTasks).returning('*');
      
      res.status(201).json(newTasks);

    } catch (err) {
      console.error(`Error in POST /api/lists/${listId}/tasks/bulk:`, err);
      res.status(500).json({ message: 'An internal server error occurred while bulk adding tasks.' });
    }
  });

  // Update a task
  router.put('/tasks/:taskId', async (req, res) => {
    try {
      const { taskId } = req.params;
      const { description, completed, dueDate, importance, dependsOn } = req.body;
      
      if (description !== undefined && (typeof description !== 'string' || description.trim() === '')) {
        return res.status(400).json({ message: 'Description must be a non-empty string.' });
      }

      // --- Dependency Validation ---
      if (dependsOn !== undefined) {
          // A task cannot depend on itself
          if (dependsOn !== null && Number(dependsOn) === Number(taskId)) {
            return res.status(409).json({ message: "A task cannot depend on itself." });
          }

          // If setting a dependency, check that it's valid
          if (dependsOn !== null) {
              const [currentTask] = await db('tasks').where('id', taskId).select('list_id');
              const [dependencyTask] = await db('tasks').where('id', dependsOn).select('list_id', 'dependsOn');

              if (!dependencyTask) {
                return res.status(404).json({ message: 'Dependency task not found.' });
              }
              if (currentTask.list_id !== dependencyTask.list_id) {
                return res.status(409).json({ message: 'Tasks must be in the same list to set a dependency.' });
              }
              // Prevent simple circular dependencies (A->B, B->A)
              if (dependencyTask.dependsOn === Number(taskId)) {
                return res.status(409).json({ message: 'Circular dependency detected. Cannot set this dependency.' });
              }
          }
      }

      // Prevent completing a task if its dependency is incomplete
      if (completed === true) {
        const [taskToCheck] = await db('tasks').where('id', taskId).select('dependsOn');
        // Use the new dependsOn from payload if provided, otherwise the one from DB
        const dependencyId = dependsOn !== undefined ? dependsOn : taskToCheck.dependsOn; 
        if (dependencyId) {
            const [dependency] = await db('tasks').where('id', dependencyId).select('completed');
            if (dependency && !dependency.completed) {
                return res.status(409).json({ message: 'Cannot complete a task while its dependency is incomplete.' });
            }
        }
      }
      // --- End Validation ---

      const updatePayload = { description: description?.trim(), completed, dueDate, importance, dependsOn };
      Object.keys(updatePayload).forEach(key => updatePayload[key] === undefined && delete updatePayload[key]);

      if (Object.keys(updatePayload).length === 0) {
        return res.status(400).json({ message: 'No valid fields provided for update.' });
      }

      const count = await db('tasks').where('id', taskId).update(updatePayload);

      if (count > 0) {
        const [updatedTask] = await db('tasks').where('id', taskId).select('*');
        res.json(updatedTask);
      } else {
        res.status(404).json({ message: 'Task not found' });
      }
    } catch (err) {
      console.error(`Error in PUT /api/tasks/${req.params.taskId}:`, err);
      res.status(500).json({ message: 'An internal server error occurred while updating the task.' });
    }
  });

  // Delete a task
  router.delete('/tasks/:taskId', async (req, res) => {
    try {
      const { taskId } = req.params;
      const count = await db('tasks').where('id', taskId).del();
      if (count > 0) {
        res.status(204).send();
      } else {
        res.status(404).json({ message: 'Task not found' });
      }
    } catch (err) {
      console.error(`Error in DELETE /api/tasks/${req.params.taskId}:`, err);
      res.status(500).json({ message: 'An internal server error occurred while deleting the task.' });
    }
  });

  return router;
}