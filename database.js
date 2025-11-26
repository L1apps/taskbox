
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
    // --- Schema Creation and Migration ---
    const hasUsersTable = await db.schema.hasTable('users');
    if (!hasUsersTable) {
      console.log("Creating 'users' table...");
      await db.schema.createTable('users', (table) => {
        table.increments('id').primary();
        table.string('username').unique().notNullable();
        table.string('password_hash').notNullable();
        table.string('role').defaultTo('USER'); // ADMIN or USER
        table.string('session_timeout');
      });
    } else {
        const hasRoleColumn = await db.schema.hasColumn('users', 'role');
        if (!hasRoleColumn) {
            console.log("Migrating 'users' table to add 'role' column...");
            await db.schema.alterTable('users', (table) => {
                table.string('role').defaultTo('USER');
            });
        }
        const hasSessionTimeout = await db.schema.hasColumn('users', 'session_timeout');
        if (!hasSessionTimeout) {
             console.log("Migrating 'users' table to add 'session_timeout' column...");
             await db.schema.alterTable('users', (table) => {
                 table.string('session_timeout');
             });
        }
    }
    
    const hasActivityLogTable = await db.schema.hasTable('activity_log');
    if (!hasActivityLogTable) {
        console.log("Creating 'activity_log' table...");
        await db.schema.createTable('activity_log', (table) => {
            table.increments('id').primary();
            table.timestamp('timestamp').defaultTo(db.fn.now());
            table.string('level'); // INFO, WARN, ERROR
            table.text('message');
        });
    }
    
    const hasListsTable = await db.schema.hasTable('lists');
    if (!hasListsTable) {
        console.log("Creating 'lists' table with owner support...");
        await db.schema.createTable('lists', (table) => {
          table.increments('id').primary();
          table.string('title').notNullable();
          table.text('description');
          table.integer('owner_id').unsigned().references('id').inTable('users').onDelete('CASCADE');
        });
    } else {
        const hasOwnerId = await db.schema.hasColumn('lists', 'owner_id');
        if (!hasOwnerId) {
            console.log("Migrating 'lists' table to add 'owner_id'...");
            await db.schema.alterTable('lists', (table) => {
                table.integer('owner_id').unsigned().references('id').inTable('users').onDelete('CASCADE');
            });
        }
    }
    
    const hasListSharesTable = await db.schema.hasTable('list_shares');
    if (!hasListSharesTable) {
        console.log("Creating 'list_shares' table...");
        await db.schema.createTable('list_shares', (table) => {
            table.primary(['list_id', 'user_id']);
            table.integer('list_id').unsigned().references('id').inTable('lists').onDelete('CASCADE');
            table.integer('user_id').unsigned().references('id').inTable('users').onDelete('CASCADE');
        });
    }
    
    const hasTasksTable = await db.schema.hasTable('tasks');
    if (!hasTasksTable) {
        console.log("Creating 'tasks' table...");
        await db.schema.createTable('tasks', (table) => {
          table.increments('id').primary();
          table.text('description').notNullable();
          table.boolean('completed').defaultTo(false);
          table.string('dueDate');
          table.timestamp('created_at').defaultTo(db.fn.now());
          table.integer('importance').defaultTo(0); // 0:Low, 1:Medium, 2:High
          table.integer('list_id').unsigned().references('id').inTable('lists').onDelete('CASCADE');
          table.integer('dependsOn').unsigned().references('id').inTable('tasks').onDelete('SET NULL');
          table.boolean('pinned').defaultTo(false);
        });
    } else {
        // Run individual migrations for the tasks table on existing setups
        const hasDependsOn = await db.schema.hasColumn('tasks', 'dependsOn');
        if (!hasDependsOn) {
            await db.schema.alterTable('tasks', t => t.integer('dependsOn').unsigned().references('id').inTable('tasks').onDelete('SET NULL'));
        }
        const hasPinned = await db.schema.hasColumn('tasks', 'pinned');
        if (!hasPinned) {
            await db.schema.alterTable('tasks', t => t.boolean('pinned').defaultTo(false));
        }
        const hasCreatedAt = await db.schema.hasColumn('tasks', 'created_at');
        if (!hasCreatedAt) {
            console.log("Migrating 'tasks' table to add 'created_at'...");
            await db.schema.alterTable('tasks', t => t.timestamp('created_at').defaultTo(db.fn.now()));
        }

        // Normalize importance levels
        const needsNormalization = await db('tasks').where('importance', '>', 2).first();
        if (needsNormalization) {
            console.log('Normalizing task importance levels...');
            await db('tasks').where('importance', '>', 2).update({ importance: 2 });
        }
    }
    
    console.log('Database schema is up to date.');

    // --- Verification ---
    await db.raw('SELECT 1');
    console.log('Database connection verified and ready.');
    return db;

  } catch (error) {
    console.error('Error setting up database:', error);
    throw error;
  }
}

export { initializeDatabase };
