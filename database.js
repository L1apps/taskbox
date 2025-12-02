
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
    pool: {
      // CRITICAL: Enable foreign key enforcement for SQLite
      afterCreate: (conn, cb) => {
        conn.run('PRAGMA foreign_keys = ON', cb);
      }
    }
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
            await db.schema.alterTable('users', (table) => {
                table.string('role').defaultTo('USER');
            });
        }
        const hasSessionTimeout = await db.schema.hasColumn('users', 'session_timeout');
        if (!hasSessionTimeout) {
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

    // LISTS Table
    const hasListsTable = await db.schema.hasTable('lists');
    if (!hasListsTable) {
        console.log("Creating 'lists' table...");
        await db.schema.createTable('lists', (table) => {
          table.increments('id').primary();
          table.string('title').notNullable();
          table.text('description');
          table.integer('owner_id').unsigned().references('id').inTable('users').onDelete('CASCADE');
          table.integer('parent_id').unsigned().nullable().references('id').inTable('lists').onDelete('CASCADE');
          table.boolean('pinned').defaultTo(false);
        });
    } else {
        const hasOwnerId = await db.schema.hasColumn('lists', 'owner_id');
        if (!hasOwnerId) {
            await db.schema.alterTable('lists', (table) => {
                table.integer('owner_id').unsigned().references('id').inTable('users').onDelete('CASCADE');
            });
        }
        const hasParentId = await db.schema.hasColumn('lists', 'parent_id');
        if (!hasParentId) {
            console.log("Migrating 'lists' table to add 'parent_id' for nesting...");
            await db.schema.alterTable('lists', (table) => {
                table.integer('parent_id').unsigned().nullable().references('id').inTable('lists').onDelete('CASCADE');
            });
        }
        const hasPinned = await db.schema.hasColumn('lists', 'pinned');
        if (!hasPinned) {
            await db.schema.alterTable('lists', (table) => {
                table.boolean('pinned').defaultTo(false);
            });
        }
    }

    // MIGRATION: Convert old Folders to Parent Lists
    const hasFoldersTable = await db.schema.hasTable('folders');
    if (hasFoldersTable) {
        const folders = await db('folders').select('*');
        if (folders.length > 0) {
            console.log(`Migrating ${folders.length} folders to lists...`);
            for (const folder of folders) {
                // Create a new list representing the folder
                const [newListId] = await db('lists').insert({
                    title: folder.name,
                    description: 'Converted from Folder',
                    owner_id: folder.owner_id,
                    parent_id: null
                });
                
                // Move children of this folder to the new list
                // Note: We check if 'lists' table has 'folder_id' column before query
                const hasFolderIdCol = await db.schema.hasColumn('lists', 'folder_id');
                if (hasFolderIdCol) {
                    await db('lists').where('folder_id', folder.id).update({ parent_id: newListId });
                }
            }
            // Clear old folders
            await db('folders').del();
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
          table.integer('importance').defaultTo(0);
          table.integer('list_id').unsigned().references('id').inTable('lists').onDelete('CASCADE');
          table.integer('dependsOn').unsigned().references('id').inTable('tasks').onDelete('SET NULL');
          table.boolean('pinned').defaultTo(false);
          table.boolean('focused').defaultTo(false);
        });
    } else {
        const hasDependsOn = await db.schema.hasColumn('tasks', 'dependsOn');
        if (!hasDependsOn) {
            await db.schema.alterTable('tasks', t => t.integer('dependsOn').unsigned().references('id').inTable('tasks').onDelete('SET NULL'));
        }
        const hasPinned = await db.schema.hasColumn('tasks', 'pinned');
        if (!hasPinned) {
            await db.schema.alterTable('tasks', t => t.boolean('pinned').defaultTo(false));
        }
        const hasFocused = await db.schema.hasColumn('tasks', 'focused');
        if (!hasFocused) {
            await db.schema.alterTable('tasks', t => t.boolean('focused').defaultTo(false));
        }
        const hasCreatedAt = await db.schema.hasColumn('tasks', 'created_at');
        if (!hasCreatedAt) {
            await db.schema.alterTable('tasks', t => t.timestamp('created_at').defaultTo(db.fn.now()));
        }
        // Normalize importance
        await db('tasks').where('importance', '>', 2).update({ importance: 2 });
    }
    
    console.log('Database schema is up to date.');
    await db.raw('SELECT 1');
    console.log('Database connection verified and ready.');
    return db;

  } catch (error) {
    console.error('Error setting up database:', error);
    throw error;
  }
}

// Function to seed example data
async function seedDatabase(db, userId) {
    try {
        console.log(`Seeding demo data for user ${userId}...`);
        const [listId] = await db('lists').insert({
            title: 'Groceries',
            description: 'Example List',
            owner_id: userId,
            parent_id: null
        });

        const tasks = [
            { description: 'Milk', completed: false, importance: 1, list_id: listId },
            { description: 'Eggs', completed: false, importance: 1, list_id: listId },
            { description: 'Bread', completed: false, importance: 0, list_id: listId },
            { description: 'Meat', completed: false, importance: 2, list_id: listId }
        ];

        await db('tasks').insert(tasks);
        console.log('Demo data seeded.');
    } catch (error) {
        console.error('Failed to seed database:', error);
    }
}

export { initializeDatabase, seedDatabase };
