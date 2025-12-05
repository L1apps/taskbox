
import knex from 'knex';
import fs from 'fs';
import path from 'path';

// This function is the single entry point to get a fully initialized DB connection.
async function initializeDatabase() {
  const dbPath = process.env.NODE_ENV === 'production' ? '/app/data' : './data';
  
  // Ensure directory exists
  if (!fs.existsSync(dbPath)) {
    console.log(`[DB] Creating database directory: ${dbPath}`);
    fs.mkdirSync(dbPath, { recursive: true });
  }
  
  const dbFile = path.join(dbPath, 'taskbox.db');

  // --- DIAGNOSTICS ---
  console.log(`[DB] Initializing database at: ${dbFile}`);
  try {
      if (fs.existsSync(dbFile)) {
          const stats = fs.statSync(dbFile);
          console.log(`[DB] Found existing database file. Size: ${(stats.size / 1024).toFixed(2)} KB`);
      } else {
          console.log(`[DB] Database file NOT found at ${dbFile}. A new empty database will be created.`);
          // List contents of directory to help debug volume mounting issues
          try {
              const files = fs.readdirSync(dbPath);
              console.log(`[DB] Current files in ${dbPath}:`, files.length > 0 ? files : '(empty)');
          } catch (e) {
              console.log(`[DB] Could not list directory ${dbPath}: ${e.message}`);
          }
      }
  } catch (err) {
      console.error("[DB] Error checking file status:", err);
  }
  // -------------------

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
                const [newListId] = await db('lists').insert({
                    title: folder.name,
                    description: 'Converted from Folder',
                    owner_id: folder.owner_id,
                    parent_id: null
                });
                
                const hasFolderIdCol = await db.schema.hasColumn('lists', 'folder_id');
                if (hasFolderIdCol) {
                    await db('lists').where('folder_id', folder.id).update({ parent_id: newListId });
                }
            }
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
            table.string('permission').defaultTo('FULL'); // VIEW, MODIFY, FULL
        });
    } else {
        const hasPermission = await db.schema.hasColumn('list_shares', 'permission');
        if (!hasPermission) {
            await db.schema.alterTable('list_shares', (table) => {
                table.string('permission').defaultTo('FULL');
            });
        }
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
          table.integer('parent_task_id').unsigned().references('id').inTable('tasks').onDelete('SET NULL');
          table.boolean('is_parent_selectable').defaultTo(true);
          table.boolean('pinned').defaultTo(false);
          table.boolean('focused').defaultTo(false);
          table.integer('sort_order').defaultTo(0);
          table.integer('global_sort_order').defaultTo(0);
        });
    } else {
        // We keep 'dependsOn' for legacy safety if needed, but add 'parent_task_id'
        const hasDependsOn = await db.schema.hasColumn('tasks', 'dependsOn');
        if (!hasDependsOn) {
            await db.schema.alterTable('tasks', t => t.integer('dependsOn').unsigned().references('id').inTable('tasks').onDelete('SET NULL'));
        }
        
        const hasParentTaskId = await db.schema.hasColumn('tasks', 'parent_task_id');
        if (!hasParentTaskId) {
            console.log("Adding parent_task_id to tasks table for subtasks...");
            await db.schema.alterTable('tasks', t => t.integer('parent_task_id').unsigned().references('id').inTable('tasks').onDelete('SET NULL'));
        }

        const hasIsParentSelectable = await db.schema.hasColumn('tasks', 'is_parent_selectable');
        if (!hasIsParentSelectable) {
            await db.schema.alterTable('tasks', t => t.boolean('is_parent_selectable').defaultTo(true));
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
        const hasSortOrder = await db.schema.hasColumn('tasks', 'sort_order');
        if (!hasSortOrder) {
            await db.schema.alterTable('tasks', t => t.integer('sort_order').defaultTo(0));
            // Initialize sort order for existing tasks to preserve stability
            const tasks = await db('tasks').select('id');
            for (const t of tasks) {
                await db('tasks').where('id', t.id).update({ sort_order: t.id });
            }
        }
        const hasGlobalSortOrder = await db.schema.hasColumn('tasks', 'global_sort_order');
        if (!hasGlobalSortOrder) {
            await db.schema.alterTable('tasks', t => t.integer('global_sort_order').defaultTo(0));
        }
        // Ensure importance is within bounds
        await db('tasks').where('importance', '>', 2).update({ importance: 2 });
    }
    
    // Quick sanity check on Users
    const userCount = await db('users').count('id as count').first();
    console.log(`[DB] Database ready. Users registered: ${userCount.count}`);

    return db;

  } catch (error) {
    console.error('[DB] Critical Error setting up database:', error);
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
            { description: 'Milk', completed: false, importance: 1, list_id: listId, sort_order: 1, is_parent_selectable: true },
            { description: 'Eggs', completed: false, importance: 1, list_id: listId, sort_order: 2, is_parent_selectable: true },
            { description: 'Bread', completed: false, importance: 0, list_id: listId, sort_order: 3, is_parent_selectable: true },
            { description: 'Meat', completed: false, importance: 2, list_id: listId, sort_order: 4, is_parent_selectable: true }
        ];

        await db('tasks').insert(tasks);
        console.log('Demo data seeded.');
    } catch (error) {
        console.error('Failed to seed database:', error);
    }
}

export { initializeDatabase, seedDatabase };
