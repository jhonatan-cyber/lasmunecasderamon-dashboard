import { query } from './lib/db';
async function run() {
    try {
        const res = await query('SELECT * FROM detalle_cuentas LIMIT 1');
        console.log(JSON.stringify(res, null, 2));
    } catch (e) {
        console.error(e);
    }
}
run();
