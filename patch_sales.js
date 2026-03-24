const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'pages', 'api', 'sales.ts');
let content = fs.readFileSync(filePath, 'utf8');

const target = '    const result = await withTransaction(async trx => {\r\n      const ventaId = generateUUID();';
const targetUnix = '    const result = await withTransaction(async trx => {\n      const ventaId = generateUUID();';

const replacement = `    const result = await withTransaction(async (trx: any) => {
      const ventaId = generateUUID();

      // 0. Si el método de pago es prepago, verificar y descontar saldo
      if (metodo_pago === 'prepago') {
        if (!clienteIdFinal) {
          throw new Error('Se requiere seleccionar un cliente registrado para pagar con saldo prepago');
        }

        const clienteData = (await trx('SELECT saldo FROM clientes WHERE id_cliente = ? FOR UPDATE', [clienteIdFinal])) as any[];
        if (clienteData.length === 0) {
          throw new Error('Cliente no encontrado');
        }

        const saldoActual = clienteData[0].saldo || 0;
        if (saldoActual < total) {
          throw new Error(\`Saldo insuficiente. Saldo disponible: $\${saldoActual.toLocaleString('es-CL')}, Total venta: $\${total.toLocaleString('es-CL')}\`);
        }

        // Descontar saldo
        await trx('UPDATE clientes SET saldo = saldo - ? WHERE id_cliente = ?', [total, clienteIdFinal]);

        // Registrar movimiento de consumo
        await trx(
          \`INSERT INTO clientes_prepago_movimientos 
          (id_movimiento, cliente_id, tipo, monto, venta_id, usuario_id, fecha_crea) 
          VALUES (?, ?, 'CONSUMO', ?, ?, ?, ?)\`,
          [generateUUID(), clienteIdFinal, total, ventaId, createdBy, now]
        );
      }`;

if (content.includes(target)) {
    content = content.replace(target, replacement);
    fs.writeFileSync(filePath, content);
    console.log('Patch applied (Windows line endings)');
} else if (content.includes(targetUnix)) {
    content = content.replace(targetUnix, replacement);
    fs.writeFileSync(filePath, content);
    console.log('Patch applied (Unix line endings)');
} else {
    // Try without spaces check if it failed
    console.log('Target not found exactly. Searching partially...');
    if (content.indexOf('const result = await withTransaction(async trx => {') !== -1) {
        console.log('Found transaction start, but not exact match. Check spaces/newlines.');
    } else {
        console.log('Transaction start not found at all.');
    }
}
