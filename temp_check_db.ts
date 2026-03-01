import { query } from './lib/db';
async function run() {
    try {
        const res = await query('DESCRIBE detalle_cuentas');
        console.log(JSON.stringify(res, null, 2));
    } catch (e) {
        console.error(e);
    }
}
run();
