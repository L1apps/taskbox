
import knex from 'knex';
import fs from 'fs';
import path from 'path';

// This function is the single entry point to get a fully initialized DB connection.
async function initializeDatabase() {
  const dbPath = process.env.NODE_ENV === 'production' ? '/app/data' : './data';
  if (!fs.existsSync(dbPath)) {
    fs.mkdirSync(dbPath, { recursive: true });
  }
  const dbFile = path.join(dbPath, 'taskbox.db');

  const db = knex({
    client: 'sqlite3',
    connection: {
      filename: dbFile,
    },
    useNullAsDefault: true,
  });

  try {
    const hasListsTable = await db.schema.hasTable('lists');
    
    // If the main table doesn't exist, we assume the DB is new and needs setup.
    if (!hasListsTable) {
      console.log('Database not found. Initializing schema and seeding data...');
      // Use a transaction to ensure the entire setup is atomic.
      await db.transaction(async (trx) => {
        // Create schema
        await trx.schema.createTable('lists', (table) => {
          table.increments('id').primary();
          table.string('title').notNullable();
          table.text('description');
        });

        await trx.schema.createTable('tasks', (table) => {
          table.increments('id').primary();
          table.text('description').notNullable();
          table.boolean('completed').defaultTo(false);
          table.string('dueDate');
          table.integer('importance').defaultTo(0);
          table.integer('list_id').unsigned().references('id').inTable('lists').onDelete('CASCADE');
        });

        // Seed data
        const [generalListId] = await trx('lists').insert({ title: 'General', description: 'A place for everyday tasks and reminders.' });
        const [shoppingListId] = await trx('lists').insert({ title: 'Shopping List', description: 'Items to buy from the store.' });

        await trx('tasks').insert([
            { list_id: generalListId, description: 'Buy groceries', completed: false, dueDate: '2025-08-15', importance: 4 },
            { list_id: generalListId, description: 'Finish React project', completed: false, dueDate: '2025-08-20', importance: 5 },
            { list_id: generalListId, description: 'Call the dentist', completed: true, dueDate: '2025-08-10', importance: 3 },
            { list_id: generalListId, description: 'Plan weekend trip', completed: false, dueDate: null, importance: 2 },
            { list_id: shoppingListId, description: 'Milk', completed: true, dueDate: null, importance: 3 },
            { list_id: shoppingListId, description: 'Bread', completed: false, dueDate: null, importance: 3 },
            { list_id: shoppingListId, description: 'Eggs', completed: false, dueDate: null, importance: 3 },
            { list_id: shoppingListId, description: 'Coffee beans', completed: false, dueDate: null, importance: 4 },
        ]);
      });
      console.log('Database initialized and seeded successfully.');
    }

    // Add a verification step to ensure the DB is ready for queries
    try {
        await db.raw('SELECT 1');
        console.log('Database connection verified and ready.');
    } catch (verificationError) {
        console.error('Database connection verification failed:', verificationError);
        throw verificationError; // Propagate failure
    }

    return db; // Return the ready-to-use instance

  } catch (error) {
    console.error('Error setting up database:', error);
    // Rethrow the error so the server startup process can catch it and fail.
    throw error;
  }
}

export { initializeDatabase };