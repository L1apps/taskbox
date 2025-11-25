
/**
 * Emergency Admin Password Reset Script
 * 
 * Usage:
 *   1. Exec into the container: docker exec -it taskbox /bin/sh
 *   2. Run script: node reset_admin.js <username> <new_password>
 */

const knex = require('knex');
const bcrypt = require('bcrypt');
const path = require('path');

const args = process.argv.slice(2);
if (args.length < 2) {
    console.error("Usage: node reset_admin.js <username> <new_password>");
    process.exit(1);
}

const [username, newPassword] = args;
const SALT_ROUNDS = 10;
const dbPath = process.env.NODE_ENV === 'production' ? '/app/data/taskbox.db' : './data/taskbox.db';

const db = knex({
    client: 'sqlite3',
    connection: { filename: dbPath },
    useNullAsDefault: true,
});

async function resetPassword() {
    try {
        const user = await db('users').where({ username }).first();
        
        if (!user) {
            console.error(`User '${username}' not found.`);
            process.exit(1);
        }

        if (user.role !== 'ADMIN') {
            console.warn(`Warning: User '${username}' is not an ADMIN.`);
        }

        const password_hash = await bcrypt.hash(newPassword, SALT_ROUNDS);
        await db('users').where({ username }).update({ password_hash });
        
        console.log(`Password for user '${username}' has been successfully reset.`);
        
        // Log to activity log if table exists
        try {
            await db('activity_log').insert({
                level: 'WARN',
                message: `Manual password reset via CLI for user '${username}'.`
            });
        } catch (e) {
            // Ignore if log table issue
        }

    } catch (err) {
        console.error("Error resetting password:", err);
    } finally {
        await db.destroy();
    }
}

resetPassword();
