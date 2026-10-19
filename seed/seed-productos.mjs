/* eslint-disable no-console -- Salida de la herramienta CLI de desarrollo. */
import 'dotenv/config';
import { createHash, randomUUID } from 'node:crypto';
import pg from 'pg';
import postgres from '../lib/database/postgres.cjs';

// Herramienta local de desarrollo: las escrituras pertenecen al módulo Inventario.
//
// Carga el catálogo de Bodega tomando como base las categorías que ya existen en la
// base: 10 productos por categoría, y cada producto con una o más PRESENTACIONES.
// Una presentación es un formato vendible con su propio nombre, capacidad, precio y
// código de barras (botella de 750 ml, lata de 330 ml, cajetilla de 20 un), y es la
// que recibe las unidades físicas con su código LM-xxxxxx; el stock de bodega
// (`productos.stock_almacen`) es la cuenta de esas unidades en ubicación `almacen`.
// Mismas reglas que el alta real del módulo: mínimo y máximo de stock van juntos,
// las categorías simples (analcohólicas y cigarrillos) no llevan comisión, y los
// destilados llevan precio de botella y de corto en `opciones_venta`.
//
// Uso:
//   node seed/seed-productos.mjs --dry-run          Simula y revierte.
//   node seed/seed-productos.mjs                    Aplica catálogo + 6 unidades por presentación.
//   node seed/seed-productos.mjs --unidades=0       Sólo catálogo, sin unidades en bodega.
//   node seed/seed-productos.mjs --unidades=24      Otra cantidad de unidades por presentación.
//
// Es idempotente: un producto que ya existe (por código, o por nombre dentro de su
// categoría, que es la duplicidad que valida el propio módulo) se omite completo, con
// sus presentaciones y unidades. Reejecutarlo no duplica nada.
const config = postgres.connectionConfig();
if (
  process.env.NODE_ENV === 'production' ||
  !['localhost', '127.0.0.1', '::1'].includes(config.host)
) {
  throw new Error('El seed de productos sólo se ejecuta en PostgreSQL local de desarrollo.');
}

const dryRun = process.argv.includes('--dry-run');
const UNIDADES_POR_DEFECTO = 6;
const UNIDADES_MAXIMAS = 100;

function leerArgumento(nombre) {
  const prefijo = `--${nombre}=`;
  const encontrado = process.argv.find(argumento => argumento.startsWith(prefijo));
  return encontrado ? encontrado.slice(prefijo.length) : null;
}

const pedidoDeUnidades = leerArgumento('unidades');
const unidadesPorPresentacion =
  pedidoDeUnidades === null ? UNIDADES_POR_DEFECTO : Number(pedidoDeUnidades);
if (
  !Number.isInteger(unidadesPorPresentacion) ||
  unidadesPorPresentacion < 0 ||
  unidadesPorPresentacion > UNIDADES_MAXIMAS
) {
  throw new Error(`--unidades debe ser un entero entre 0 y ${UNIDADES_MAXIMAS}.`);
}

const PRODUCTOS_POR_CATEGORIA = 10;
// Límites de reposición: van juntos en la presentación (CHECK de la migración 079).
const STOCK_MINIMO = 4;
const STOCK_MAXIMO = 12;
// Reparto por defecto cuando la categoría no fija comisión propia.
const PORCENTAJE_COMISION_BOTELLA = 0.2;
const PORCENTAJE_COMISION_SHOT = 0.25;
const ML_SHOT = 50;
const ML_SHOT_ANFITRIONA = 35;
// Prefijo GS1 reservado para códigos internos (modules/inventario/helpers.ts).
const EAN_PREFIJO_INTERNO = '29';

// El catálogo: 10 productos por categoría, con las presentaciones de cada uno.
// `comisionPorcentaje` / `comisionFija` reparten la comisión de la botella; una
// presentación puede fijar la suya. `conShots` agrega el corto a `opciones_venta` y
// los ml por shot del producto. `alias` son nombres alternativos con los que también
// puede estar registrada la categoría en la base.
const CATALOGOS = [
  {
    categoria: 'Cerveza',
    prefijo: 'CER',
    productos: [
      {
        nombre: 'Paceña Pilsener',
        descripcion: 'Cerveza lager boliviana',
        presentaciones: [
          { nombre: '330 ml', ml: 330, compra: 1400, venta: 3000 },
          { nombre: '620 ml', ml: 620, compra: 2000, venta: 4200 }
        ]
      },
      { nombre: 'Paceña Trigueña', descripcion: 'Cerveza trigueña boliviana', presentaciones: [{ nombre: '330 ml', ml: 330, compra: 1400, venta: 3000 }] },
      {
        nombre: 'Huari Pilsener',
        descripcion: 'Cerveza lager del valle',
        presentaciones: [
          { nombre: '330 ml', ml: 330, compra: 1400, venta: 3000 },
          { nombre: '620 ml', ml: 620, compra: 2000, venta: 4200 }
        ]
      },
      { nombre: 'Huari Negra', descripcion: 'Cerveza negra del valle', presentaciones: [{ nombre: '330 ml', ml: 330, compra: 1500, venta: 3200 }] },
      { nombre: 'Bock Dorada', descripcion: 'Cerveza dorada boliviana', presentaciones: [{ nombre: '330 ml', ml: 330, compra: 1500, venta: 3200 }] },
      { nombre: 'Taquiña Pilsener', descripcion: 'Cerveza lager cochabambina', presentaciones: [{ nombre: '330 ml', ml: 330, compra: 1400, venta: 3000 }] },
      { nombre: 'Corona Extra', descripcion: 'Cerveza mexicana importada', presentaciones: [{ nombre: '330 ml', ml: 330, compra: 2200, venta: 4500 }] },
      { nombre: 'Stella Artois', descripcion: 'Cerveza belga importada', presentaciones: [{ nombre: '330 ml', ml: 330, compra: 2000, venta: 4200 }] },
      { nombre: 'Kunstmann Torobayo', descripcion: 'Cerveza artesanal chilena', presentaciones: [{ nombre: '330 ml', ml: 330, compra: 2000, venta: 4200 }] },
      { nombre: 'Brahma Chopp', descripcion: 'Cerveza lager brasileña', presentaciones: [{ nombre: '330 ml', ml: 330, compra: 1400, venta: 3000 }] }
    ]
  },
  {
    categoria: 'Bebidas analcohólicas',
    alias: ['Bebidas Sin Alcohol'],
    prefijo: 'ANA',
    comisionPorcentaje: 0,
    productos: [
      {
        nombre: 'Coca-Cola Original',
        descripcion: 'Gaseosa cola',
        presentaciones: [
          { nombre: '1500 ml', ml: 1500, compra: 1600, venta: 2900 },
          { nombre: '500 ml', ml: 500, compra: 700, venta: 1500 }
        ]
      },
      { nombre: 'Coca-Cola Zero', descripcion: 'Gaseosa cola sin azúcar', presentaciones: [{ nombre: '1500 ml', ml: 1500, compra: 1600, venta: 2900 }] },
      { nombre: 'Sprite', descripcion: 'Gaseosa lima limón', presentaciones: [{ nombre: '1500 ml', ml: 1500, compra: 1600, venta: 2900 }] },
      { nombre: 'Fanta Naranja', descripcion: 'Gaseosa de naranja', presentaciones: [{ nombre: '1500 ml', ml: 1500, compra: 1600, venta: 2900 }] },
      { nombre: 'Pepsi', descripcion: 'Gaseosa cola', presentaciones: [{ nombre: '1500 ml', ml: 1500, compra: 1500, venta: 2800 }] },
      { nombre: 'Agua Mineral Cachantun', descripcion: 'Agua mineral sin gas', presentaciones: [{ nombre: '500 ml', ml: 500, compra: 600, venta: 1400 }] },
      { nombre: 'Agua Mineral Vital', descripcion: 'Agua mineral con gas', presentaciones: [{ nombre: '1000 ml', ml: 1000, compra: 700, venta: 1600 }] },
      { nombre: 'Jugo Watts Durazno', descripcion: 'Néctar de durazno', presentaciones: [{ nombre: '1000 ml', ml: 1000, compra: 1000, venta: 2200 }] },
      { nombre: 'Ginger Ale Canada Dry', descripcion: 'Gaseosa ginger ale', presentaciones: [{ nombre: '1500 ml', ml: 1500, compra: 1700, venta: 3000 }] },
      { nombre: 'Tónica Schweppes', descripcion: 'Agua tónica', presentaciones: [{ nombre: '1000 ml', ml: 1000, compra: 1200, venta: 2400 }] }
    ]
  },
  {
    categoria: 'Snacks',
    prefijo: 'SNA',
    comisionPorcentaje: 0,
    productos: [
      { nombre: 'Papas Fritas Lays Clásicas', descripcion: 'Papas fritas clásicas', presentaciones: [{ nombre: '1 un', ml: null, compra: 1200, venta: 2500 }] },
      { nombre: 'Papas Fritas Pringles Original', descripcion: 'Papas fritas en tubo', presentaciones: [{ nombre: '1 un', ml: null, compra: 2500, venta: 4500 }] },
      { nombre: 'Maní Salado Evercrisp', descripcion: 'Maní salado', presentaciones: [{ nombre: '1 un', ml: null, compra: 900, venta: 2000 }] },
      { nombre: 'Mix Frutos Secos', descripcion: 'Mezcla de frutos secos', presentaciones: [{ nombre: '1 un', ml: null, compra: 1500, venta: 3000 }] },
      { nombre: 'Galletas Oreo', descripcion: 'Galletas de chocolate', presentaciones: [{ nombre: '1 un', ml: null, compra: 700, venta: 1800 }] },
      { nombre: 'Chocolate Snickers', descripcion: 'Barra de chocolate con maní', presentaciones: [{ nombre: '1 un', ml: null, compra: 800, venta: 2000 }] },
      { nombre: 'Doritos Queso', descripcion: 'Nachos sabor queso', presentaciones: [{ nombre: '1 un', ml: null, compra: 1200, venta: 2500 }] },
      { nombre: 'Chizitos Evercrisp', descripcion: 'Snack de maíz', presentaciones: [{ nombre: '1 un', ml: null, compra: 700, venta: 1800 }] },
      { nombre: 'Ramitas Evercrisp', descripcion: 'Snack de harina', presentaciones: [{ nombre: '1 un', ml: null, compra: 700, venta: 1800 }] },
      { nombre: 'Chicles Trident Menta', descripcion: 'Chicles sin azúcar', presentaciones: [{ nombre: '1 un', ml: null, compra: 500, venta: 1500 }] }
    ]
  },
  {
    categoria: 'Vinos',
    prefijo: 'VIN',
    comisionPorcentaje: PORCENTAJE_COMISION_BOTELLA,
    productos: [
      {
        nombre: 'Casillero del Diablo Cabernet Sauvignon',
        descripcion: 'Vino tinto reserva',
        presentaciones: [
          { nombre: '750 ml', ml: 750, compra: 4500, venta: 9900 },
          { nombre: '1500 ml', ml: 1500, compra: 9000, venta: 19900 }
        ]
      },
      { nombre: 'Casillero del Diablo Chardonnay', descripcion: 'Vino blanco reserva', presentaciones: [{ nombre: '750 ml', ml: 750, compra: 4500, venta: 9900 }] },
      { nombre: 'Frontera Cabernet Sauvignon', descripcion: 'Vino tinto de mesa', presentaciones: [{ nombre: '750 ml', ml: 750, compra: 2800, venta: 6500 }] },
      { nombre: 'Gato Negro Cabernet Sauvignon', descripcion: 'Vino tinto de mesa', presentaciones: [{ nombre: '750 ml', ml: 750, compra: 2500, venta: 5900 }] },
      { nombre: 'Santa Rita 120 Cabernet', descripcion: 'Vino tinto reserva', presentaciones: [{ nombre: '750 ml', ml: 750, compra: 3200, venta: 7500 }] },
      { nombre: 'Undurraga Sibaris Carmenere', descripcion: 'Vino tinto carmenere', presentaciones: [{ nombre: '750 ml', ml: 750, compra: 3500, venta: 8000 }] },
      { nombre: 'Viña Real Reserva', descripcion: 'Vino tinto reserva', presentaciones: [{ nombre: '750 ml', ml: 750, compra: 4000, venta: 8900 }] },
      { nombre: 'Miguel Torres Santa Digna', descripcion: 'Vino tinto reserva', presentaciones: [{ nombre: '750 ml', ml: 750, compra: 5000, venta: 11000 }] },
      { nombre: 'Campo Viejo Tempranillo', descripcion: 'Vino tinto español', presentaciones: [{ nombre: '750 ml', ml: 750, compra: 5500, venta: 12000 }] },
      { nombre: 'Toro Viejo Malbec', descripcion: 'Vino tinto argentino', presentaciones: [{ nombre: '750 ml', ml: 750, compra: 2800, venta: 6500 }] }
    ]
  },
  {
    categoria: 'Champagne',
    prefijo: 'CHA',
    // Precio de club por tramo de anfitrionas: 1-2 acompañantes a 120.000 con
    // 40.000 de comisión (lib/business/champagne.ts).
    comisionFija: 40000,
    maxAnfitrionas: 5,
    productos: [
      { nombre: 'Moët & Chandon Impérial Brut', descripcion: 'Champagne brut', presentaciones: [{ nombre: '750 ml', ml: 750, compra: 75000, venta: 120000 }] },
      { nombre: 'Veuve Clicquot Yellow Label', descripcion: 'Champagne brut', presentaciones: [{ nombre: '750 ml', ml: 750, compra: 85000, venta: 120000 }] },
      { nombre: 'Mumm Cordon Rouge', descripcion: 'Champagne brut', presentaciones: [{ nombre: '750 ml', ml: 750, compra: 60000, venta: 120000 }] },
      { nombre: 'Freixenet Carta Nevada', descripcion: 'Espumoso semiseco', presentaciones: [{ nombre: '750 ml', ml: 750, compra: 12000, venta: 120000 }] },
      { nombre: 'Chandon Extra Brut', descripcion: 'Espumoso extra brut', presentaciones: [{ nombre: '750 ml', ml: 750, compra: 45000, venta: 120000 }] },
      { nombre: 'Codorníu Clásico', descripcion: 'Espumoso brut', presentaciones: [{ nombre: '750 ml', ml: 750, compra: 15000, venta: 120000 }] },
      { nombre: 'Undurraga Brut', descripcion: 'Espumoso brut', presentaciones: [{ nombre: '750 ml', ml: 750, compra: 9000, venta: 120000 }] },
      { nombre: 'Baron Lacour Brut', descripcion: 'Espumoso brut', presentaciones: [{ nombre: '750 ml', ml: 750, compra: 10000, venta: 120000 }] },
      { nombre: 'Riccadonna Asti', descripcion: 'Espumoso dulce italiano', presentaciones: [{ nombre: '750 ml', ml: 750, compra: 14000, venta: 120000 }] },
      { nombre: 'Federico de Alvear Brut', descripcion: 'Espumoso brut', presentaciones: [{ nombre: '750 ml', ml: 750, compra: 13000, venta: 120000 }] }
    ]
  },
  {
    categoria: 'Pisco',
    prefijo: 'PIS',
    conShots: true,
    productos: [
      { nombre: 'Pisco Capel Reservado 35°', descripcion: 'Pisco reservado', shot: 3500, presentaciones: [{ nombre: '700 ml', ml: 700, compra: 6500, venta: 13900 }] },
      { nombre: 'Pisco Capel Especial 35°', descripcion: 'Pisco especial', shot: 3200, presentaciones: [{ nombre: '700 ml', ml: 700, compra: 5500, venta: 11900 }] },
      { nombre: 'Pisco Alto del Carmen Envejecido', descripcion: 'Pisco envejecido en madera', shot: 4200, presentaciones: [{ nombre: '750 ml', ml: 750, compra: 8000, venta: 16900 }] },
      { nombre: 'Pisco Mistral 35°', descripcion: 'Pisco del valle del Elqui', shot: 3800, presentaciones: [{ nombre: '700 ml', ml: 700, compra: 7000, venta: 14900 }] },
      { nombre: 'Pisco Control C', descripcion: 'Pisco del valle de Itata', shot: 3000, presentaciones: [{ nombre: '700 ml', ml: 700, compra: 5000, venta: 10900 }] },
      { nombre: 'Pisco La Serena', descripcion: 'Pisco del valle del Limarí', shot: 3000, presentaciones: [{ nombre: '700 ml', ml: 700, compra: 4800, venta: 10500 }] },
      { nombre: 'Pisco Bauzá', descripcion: 'Pisco del valle de Elqui', shot: 3300, presentaciones: [{ nombre: '700 ml', ml: 700, compra: 6000, venta: 12900 }] },
      { nombre: 'Pisco Tres Erres', descripcion: 'Pisco reservado', shot: 3400, presentaciones: [{ nombre: '700 ml', ml: 700, compra: 6200, venta: 13000 }] },
      { nombre: 'Pisco Waqar', descripcion: 'Pisco artesanal', shot: 4500, presentaciones: [{ nombre: '750 ml', ml: 750, compra: 8500, venta: 17900 }] },
      { nombre: 'Pisco Mal Paso', descripcion: 'Pisco artesanal', shot: 4500, presentaciones: [{ nombre: '750 ml', ml: 750, compra: 9000, venta: 18900 }] }
    ]
  },
  {
    categoria: 'Tequila',
    prefijo: 'TEQ',
    conShots: true,
    productos: [
      { nombre: 'José Cuervo Especial Reposado', descripcion: 'Tequila reposado', shot: 5500, presentaciones: [{ nombre: '750 ml', ml: 750, compra: 18000, venta: 32000 }] },
      { nombre: 'José Cuervo Tradicional', descripcion: 'Tequila reposado 100% agave', shot: 6000, presentaciones: [{ nombre: '750 ml', ml: 750, compra: 22000, venta: 38000 }] },
      { nombre: 'Sauza Hornitos Reposado', descripcion: 'Tequila reposado', shot: 6500, presentaciones: [{ nombre: '750 ml', ml: 750, compra: 25000, venta: 42000 }] },
      {
        nombre: 'El Jimador Blanco',
        descripcion: 'Tequila blanco 100% agave',
        shot: 5500,
        presentaciones: [
          { nombre: '750 ml', ml: 750, compra: 20000, venta: 35000 },
          { nombre: '1000 ml', ml: 1000, compra: 28000, venta: 48000 }
        ]
      },
      { nombre: 'Don Julio Blanco', descripcion: 'Tequila blanco premium', shot: 9000, presentaciones: [{ nombre: '750 ml', ml: 750, compra: 45000, venta: 75000 }] },
      { nombre: 'Patrón Silver', descripcion: 'Tequila blanco premium', shot: 10000, presentaciones: [{ nombre: '750 ml', ml: 750, compra: 50000, venta: 85000 }] },
      { nombre: 'Camino Real Blanco', descripcion: 'Tequila blanco', shot: 5000, presentaciones: [{ nombre: '750 ml', ml: 750, compra: 15000, venta: 28000 }] },
      { nombre: 'Centenario Reposado', descripcion: 'Tequila reposado', shot: 7500, presentaciones: [{ nombre: '750 ml', ml: 750, compra: 32000, venta: 55000 }] },
      { nombre: 'Olmeca Blanco', descripcion: 'Tequila blanco', shot: 6000, presentaciones: [{ nombre: '750 ml', ml: 750, compra: 24000, venta: 40000 }] },
      { nombre: '1800 Reposado', descripcion: 'Tequila reposado premium', shot: 8000, presentaciones: [{ nombre: '750 ml', ml: 750, compra: 35000, venta: 60000 }] }
    ]
  },
  {
    categoria: 'Ron',
    prefijo: 'RON',
    conShots: true,
    productos: [
      {
        nombre: 'Bacardí Carta Blanca',
        descripcion: 'Ron blanco',
        shot: 4000,
        presentaciones: [
          { nombre: '750 ml', ml: 750, compra: 9000, venta: 18000 },
          { nombre: '1000 ml', ml: 1000, compra: 12000, venta: 23000 }
        ]
      },
      { nombre: 'Bacardí Añejo', descripcion: 'Ron añejo', shot: 4200, presentaciones: [{ nombre: '750 ml', ml: 750, compra: 10000, venta: 19500 }] },
      { nombre: 'Havana Club 3 Años', descripcion: 'Ron añejo cubano', shot: 4500, presentaciones: [{ nombre: '750 ml', ml: 750, compra: 11000, venta: 21000 }] },
      { nombre: 'Havana Club 7 Años', descripcion: 'Ron añejo premium', shot: 6000, presentaciones: [{ nombre: '750 ml', ml: 750, compra: 16000, venta: 30000 }] },
      { nombre: 'Captain Morgan Original Spiced', descripcion: 'Ron especiado', shot: 4800, presentaciones: [{ nombre: '750 ml', ml: 750, compra: 12000, venta: 23000 }] },
      { nombre: 'Flor de Caña 5 Años', descripcion: 'Ron añejo nicaragüense', shot: 5500, presentaciones: [{ nombre: '750 ml', ml: 750, compra: 14000, venta: 27000 }] },
      { nombre: 'Ron Medellín Añejo', descripcion: 'Ron añejo colombiano', shot: 5000, presentaciones: [{ nombre: '750 ml', ml: 750, compra: 13000, venta: 25000 }] },
      { nombre: 'Appleton Estate Signature', descripcion: 'Ron jamaiquino', shot: 5800, presentaciones: [{ nombre: '750 ml', ml: 750, compra: 15000, venta: 29000 }] },
      { nombre: 'Malibu Coconut', descripcion: 'Licor de ron con coco', shot: 4500, presentaciones: [{ nombre: '750 ml', ml: 750, compra: 11000, venta: 22000 }] },
      { nombre: 'Botran Reserva', descripcion: 'Ron añejo guatemalteco', shot: 6200, presentaciones: [{ nombre: '750 ml', ml: 750, compra: 17000, venta: 32000 }] }
    ]
  },
  {
    categoria: 'Vodka',
    prefijo: 'VOD',
    conShots: true,
    productos: [
      {
        nombre: 'Absolut Original',
        descripcion: 'Vodka sueco',
        shot: 4500,
        presentaciones: [
          { nombre: '750 ml', ml: 750, compra: 12000, venta: 23000 },
          { nombre: '1000 ml', ml: 1000, compra: 16000, venta: 29000 }
        ]
      },
      { nombre: 'Absolut Citron', descripcion: 'Vodka sabor limón', shot: 4500, presentaciones: [{ nombre: '750 ml', ml: 750, compra: 12000, venta: 23000 }] },
      { nombre: 'Smirnoff Red', descripcion: 'Vodka clásico', shot: 3800, presentaciones: [{ nombre: '700 ml', ml: 700, compra: 8000, venta: 16000 }] },
      { nombre: 'Stolichnaya Premium', descripcion: 'Vodka premium', shot: 5000, presentaciones: [{ nombre: '750 ml', ml: 750, compra: 14000, venta: 26000 }] },
      { nombre: 'Finlandia', descripcion: 'Vodka finlandés', shot: 4200, presentaciones: [{ nombre: '750 ml', ml: 750, compra: 10000, venta: 19500 }] },
      { nombre: 'Grey Goose', descripcion: 'Vodka premium francés', shot: 8000, presentaciones: [{ nombre: '750 ml', ml: 750, compra: 30000, venta: 52000 }] },
      { nombre: 'Belvedere', descripcion: 'Vodka premium polaco', shot: 8500, presentaciones: [{ nombre: '750 ml', ml: 750, compra: 32000, venta: 55000 }] },
      { nombre: 'Skyy', descripcion: 'Vodka americano', shot: 4400, presentaciones: [{ nombre: '750 ml', ml: 750, compra: 12000, venta: 22500 }] },
      { nombre: 'Ciroc Snap Frost', descripcion: 'Vodka de uva premium', shot: 9000, presentaciones: [{ nombre: '750 ml', ml: 750, compra: 35000, venta: 60000 }] },
      { nombre: 'Russian Standard Original', descripcion: 'Vodka ruso', shot: 4300, presentaciones: [{ nombre: '750 ml', ml: 750, compra: 11000, venta: 21000 }] }
    ]
  },
  {
    categoria: 'Whisky',
    prefijo: 'WHI',
    conShots: true,
    productos: [
      {
        nombre: 'Johnnie Walker Red Label',
        descripcion: 'Whisky escocés blend',
        shot: 5500,
        presentaciones: [
          { nombre: '750 ml', ml: 750, compra: 18000, venta: 32000 },
          { nombre: '1000 ml', ml: 1000, compra: 24000, venta: 42000 }
        ]
      },
      { nombre: 'Johnnie Walker Black Label', descripcion: 'Whisky escocés 12 años', shot: 8000, presentaciones: [{ nombre: '750 ml', ml: 750, compra: 32000, venta: 55000 }] },
      { nombre: 'Chivas Regal 12', descripcion: 'Whisky escocés 12 años', shot: 9000, presentaciones: [{ nombre: '750 ml', ml: 750, compra: 38000, venta: 65000 }] },
      { nombre: "Jack Daniel's Old No. 7", descripcion: 'Whisky americano', shot: 7800, presentaciones: [{ nombre: '750 ml', ml: 750, compra: 30000, venta: 52000 }] },
      { nombre: "Ballantine's Finest", descripcion: 'Whisky escocés blend', shot: 6000, presentaciones: [{ nombre: '750 ml', ml: 750, compra: 20000, venta: 36000 }] },
      { nombre: 'Jameson Irish Whiskey', descripcion: 'Whisky irlandés', shot: 7000, presentaciones: [{ nombre: '750 ml', ml: 750, compra: 26000, venta: 45000 }] },
      { nombre: 'Glenfiddich 12', descripcion: 'Whisky escocés single malt', shot: 11000, presentaciones: [{ nombre: '750 ml', ml: 750, compra: 48000, venta: 82000 }] },
      { nombre: 'The Macallan 12 Double Cask', descripcion: 'Whisky escocés single malt', shot: 15000, presentaciones: [{ nombre: '750 ml', ml: 750, compra: 75000, venta: 130000 }] },
      { nombre: "Buchanan's Deluxe 12", descripcion: 'Whisky escocés 12 años', shot: 9500, presentaciones: [{ nombre: '750 ml', ml: 750, compra: 40000, venta: 70000 }] },
      { nombre: "Grant's Family Reserve", descripcion: 'Whisky escocés blend', shot: 5000, presentaciones: [{ nombre: '750 ml', ml: 750, compra: 14000, venta: 26000 }] }
    ]
  },
  {
    categoria: 'Energizantes',
    prefijo: 'ENE',
    comisionPorcentaje: 0,
    productos: [
      { nombre: 'Red Bull', descripcion: 'Bebida energizante', presentaciones: [{ nombre: '250 ml', ml: 250, compra: 1500, venta: 3200 }] },
      { nombre: 'Red Bull Sugarfree', descripcion: 'Bebida energizante sin azúcar', presentaciones: [{ nombre: '250 ml', ml: 250, compra: 1500, venta: 3200 }] },
      { nombre: 'Monster Energy Green', descripcion: 'Bebida energizante', presentaciones: [{ nombre: '500 ml', ml: 500, compra: 2000, venta: 3900 }] },
      { nombre: 'Monster Ultra Paradise', descripcion: 'Bebida energizante sin azúcar', presentaciones: [{ nombre: '500 ml', ml: 500, compra: 2000, venta: 3900 }] },
      { nombre: 'Speed Energy', descripcion: 'Bebida energizante', presentaciones: [{ nombre: '500 ml', ml: 500, compra: 1500, venta: 3200 }] },
      { nombre: '220V Ultra', descripcion: 'Bebida energizante', presentaciones: [{ nombre: '500 ml', ml: 500, compra: 1400, venta: 3000 }] },
      { nombre: 'Volt Blue', descripcion: 'Bebida energizante', presentaciones: [{ nombre: '500 ml', ml: 500, compra: 1500, venta: 3200 }] },
      { nombre: 'Rockstar Original', descripcion: 'Bebida energizante', presentaciones: [{ nombre: '500 ml', ml: 500, compra: 1800, venta: 3600 }] },
      { nombre: 'Burn Original', descripcion: 'Bebida energizante', presentaciones: [{ nombre: '500 ml', ml: 500, compra: 1700, venta: 3500 }] },
      { nombre: 'Ciclón Energy', descripcion: 'Bebida energizante', presentaciones: [{ nombre: '500 ml', ml: 500, compra: 1600, venta: 3400 }] }
    ]
  },
  {
    categoria: 'Cigarrillos',
    prefijo: 'CIG',
    comisionPorcentaje: 0,
    productos: [
      {
        nombre: 'Marlboro Rojo',
        descripcion: 'Cigarrillos cajetilla dura',
        presentaciones: [
          { nombre: '20 un', ml: null, compra: 3000, venta: 4500 },
          { nombre: '1 un', ml: null, compra: 200, venta: 400 }
        ]
      },
      { nombre: 'Marlboro Gold', descripcion: 'Cigarrillos suaves', presentaciones: [{ nombre: '20 un', ml: null, compra: 3000, venta: 4500 }] },
      { nombre: 'Lucky Strike Original', descripcion: 'Cigarrillos cajetilla blanda', presentaciones: [{ nombre: '20 un', ml: null, compra: 2800, venta: 4200 }] },
      { nombre: 'Camel Filters', descripcion: 'Cigarrillos cajetilla dura', presentaciones: [{ nombre: '20 un', ml: null, compra: 2900, venta: 4300 }] },
      { nombre: 'Pall Mall Rojo', descripcion: 'Cigarrillos cajetilla blanda', presentaciones: [{ nombre: '20 un', ml: null, compra: 2500, venta: 3800 }] },
      { nombre: 'L&M Rojo', descripcion: 'Cigarrillos cajetilla blanda', presentaciones: [{ nombre: '20 un', ml: null, compra: 2600, venta: 4000 }] },
      {
        nombre: 'Rothmans',
        descripcion: 'Cigarrillos cajetilla blanda',
        presentaciones: [
          { nombre: '20 un', ml: null, compra: 2500, venta: 3800 },
          { nombre: '1 un', ml: null, compra: 180, venta: 350 }
        ]
      },
      { nombre: 'Kent Blue', descripcion: 'Cigarrillos suaves', presentaciones: [{ nombre: '20 un', ml: null, compra: 2800, venta: 4200 }] },
      { nombre: 'Viceroy Rojo', descripcion: 'Cigarrillos cajetilla blanda', presentaciones: [{ nombre: '20 un', ml: null, compra: 2400, venta: 3700 }] },
      { nombre: 'Chesterfield Original', descripcion: 'Cigarrillos cajetilla blanda', presentaciones: [{ nombre: '20 un', ml: null, compra: 2500, venta: 3800 }] }
    ]
  }
];

/** Sin acentos ni mayúsculas, como la búsqueda del módulo. */
function normalizar(texto) {
  return String(texto)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

/** UUID estable: el mismo producto siempre recibe el mismo id. */
function idPara(clave) {
  const hash = createHash('sha256').update(`seed-productos-v1:${clave}`).digest('hex');
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-${hash.slice(12, 16)}-${hash.slice(16, 20)}-${hash.slice(20, 32)}`;
}

/** Dígito verificador EAN-13 (mismo cálculo que modules/inventario/helpers.ts). */
function digitoVerificadorEan13(digitos12) {
  let suma = 0;
  for (let i = 0; i < 12; i++) {
    const digito = Number(digitos12[i]);
    suma += i % 2 === 0 ? digito : digito * 3;
  }
  return (10 - (suma % 10)) % 10;
}

function ean13Para(clave) {
  const hash = createHash('sha256').update(`seed-productos-ean:${clave}`).digest('hex');
  const relleno = (BigInt(`0x${hash.slice(0, 16)}`) % 10000000000n).toString().padStart(10, '0');
  const base = EAN_PREFIJO_INTERNO + relleno;
  return base + String(digitoVerificadorEan13(base));
}

/** EAN libre: los códigos son únicos en toda la base, así que se escalan si chocan. */
function reservarEan(clave, usados) {
  for (let intento = 0; intento < 1000; intento++) {
    const codigo = ean13Para(intento === 0 ? clave : `${clave}:${intento}`);
    if (!usados.has(codigo)) {
      usados.add(codigo);
      return codigo;
    }
  }
  throw new Error(`No se pudo reservar un código de barras para ${clave}`);
}

function comisionDePresentacion(catalogo, presentacion, venta) {
  if (presentacion.comision !== undefined) return Math.round(presentacion.comision);
  if (catalogo.comisionFija !== undefined) return Math.round(catalogo.comisionFija);
  const porcentaje = catalogo.conShots
    ? PORCENTAJE_COMISION_BOTELLA
    : (catalogo.comisionPorcentaje ?? 0);
  return Math.round(venta * porcentaje);
}

/**
 * `opciones_venta` del formato: botella y, en los destilados, corto. Con la opción
 * `botella` presente el bar puede vender la botella entera; con `shot`, el corto.
 */
function opcionesVentaDe(catalogo, producto, venta, comision) {
  if (!catalogo.conShots) return null;
  return JSON.stringify([
    { tipo: 'botella', precio: venta, comision },
    {
      tipo: 'shot',
      precio: Math.round(producto.shot),
      comision: Math.round(producto.shot * PORCENTAJE_COMISION_SHOT)
    }
  ]);
}

const client = new pg.Client(config);

async function codigosDeUnidad(cantidad) {
  const { rows } = await client.query(
    "SELECT nextval('inventario_sku_seq') AS seq FROM generate_series(1, $1)",
    [cantidad]
  );
  return rows.map(row => `LM-${String(Number(row.seq)).padStart(6, '0')}`);
}

/** Inserta el producto con sus presentaciones y las unidades de bodega que pida el seed. */
async function crearProducto(catalogo, producto, codigo, categoriaId, indice, usados) {
  const id = idPara(codigo);
  const primera = producto.presentaciones[0];
  const primeraComision = comisionDePresentacion(catalogo, primera, primera.venta);

  await client.query(
    `
    INSERT INTO productos (
      id_producto, codigo, nombre, categoria_id, display_order, precio, comision,
      descripcion, fecha_crea, estado, foto, stock_almacen,
      ml_shot, ml_shot_anfitriona, max_anfitrionas
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, now(), 1, 'default.png', 0, $9, $10, $11)
    `,
    [
      id,
      codigo,
      producto.nombre,
      categoriaId,
      indice + 1,
      primera.venta,
      primeraComision,
      producto.descripcion,
      catalogo.conShots ? ML_SHOT : null,
      catalogo.conShots ? ML_SHOT_ANFITRIONA : null,
      catalogo.maxAnfitrionas ?? null
    ]
  );

  let unidadesGeneradas = 0;
  for (const [indicePresentacion, presentacion] of producto.presentaciones.entries()) {
    const comision = comisionDePresentacion(catalogo, presentacion, presentacion.venta);
    const presentacionId = randomUUID();
    await client.query(
      `
      INSERT INTO inventario_presentaciones (
        id, producto_id, nombre, codigo_barras, precio_compra, precio_venta, comision,
        opciones_venta, foto, ml_botella, stock_minimo, stock_maximo, fecha_crea
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NULL, $9, $10, $11, now() + ($12 * interval '1 millisecond'))
      `,
      [
        presentacionId,
        id,
        presentacion.nombre,
        reservarEan(`${codigo}:${presentacion.nombre}`, usados),
        presentacion.compra,
        presentacion.venta,
        comision,
        opcionesVentaDe(catalogo, producto, presentacion.venta, comision),
        presentacion.ml,
        STOCK_MINIMO,
        STOCK_MAXIMO,
        // El catálogo ordena las presentaciones por fecha: conserva el orden del seed
        // (primero el formato principal) aunque el alta ocurra en la misma transacción.
        indicePresentacion
      ]
    );

    if (unidadesPorPresentacion === 0) continue;
    const codigos = await codigosDeUnidad(unidadesPorPresentacion);
    const columnas = ['id', 'producto_id', 'presentacion_id', 'codigo', 'codigo_barras', 'ubicacion', 'estado', 'fecha_crea'];
    const valores = [];
    const filas = codigos.map((codigoUnidad, indiceUnidad) => {
      const fila = [
        randomUUID(),
        id,
        presentacionId,
        codigoUnidad,
        reservarEan(`${codigo}:${presentacion.nombre}:unidad:${indiceUnidad}`, usados),
        'almacen',
        'almacen',
        new Date()
      ];
      valores.push(...fila);
      return `(${columnas.map((_, posicion) => `$${valores.length - columnas.length + posicion + 1}`).join(', ')})`;
    });
    await client.query(
      `INSERT INTO inventario_unidades (${columnas.join(', ')}) VALUES ${filas.join(', ')}`,
      valores
    );
    unidadesGeneradas += codigos.length;
  }

  if (unidadesGeneradas > 0) {
    await client.query('UPDATE productos SET stock_almacen = $1 WHERE id_producto = $2', [
      unidadesGeneradas,
      id
    ]);
  }
  return { id, presentaciones: producto.presentaciones.length, unidades: unidadesGeneradas };
}

try {
  await client.connect();
  await client.query('BEGIN');
  // Serializa ejecuciones simultáneas del seed y de cualquier alta de catálogo.
  await client.query('LOCK TABLE productos, inventario_presentaciones IN SHARE ROW EXCLUSIVE MODE');

  const { rows: categorias } = await client.query(
    'SELECT id_categoria, nombre, estado FROM categorias ORDER BY display_order ASC, nombre ASC'
  );

  // Códigos de barras ya en uso (presentaciones y unidades): los EAN son únicos.
  const usados = new Set();
  for (const tabla of ['inventario_presentaciones', 'inventario_unidades']) {
    const { rows } = await client.query(
      `SELECT codigo_barras FROM ${tabla} WHERE codigo_barras IS NOT NULL`
    );
    for (const fila of rows) usados.add(fila.codigo_barras);
  }

  const catalogoPorNombre = new Map();
  for (const catalogo of CATALOGOS) {
    if (catalogo.productos.length !== PRODUCTOS_POR_CATEGORIA) {
      throw new Error(
        `El catálogo de ${catalogo.categoria} debe tener ${PRODUCTOS_POR_CATEGORIA} productos (tiene ${catalogo.productos.length}).`
      );
    }
    for (const nombre of [catalogo.categoria, ...(catalogo.alias ?? [])]) {
      catalogoPorNombre.set(normalizar(nombre), catalogo);
    }
  }

  const resumen = [];
  const omitidas = [];
  const usadosCatalogo = new Set();

  for (const categoria of categorias) {
    const catalogo = catalogoPorNombre.get(normalizar(categoria.nombre));
    if (!catalogo) {
      omitidas.push(`${categoria.nombre} (sin catálogo en el seed)`);
      continue;
    }
    // Un catálogo se aplica una sola vez: si existen dos categorías con nombres
    // equivalentes ("Bebidas analcohólicas" y "Bebidas Sin Alcohol"), la segunda se
    // omite para no repetir códigos de producto (el alta real los busca globalmente).
    if (usadosCatalogo.has(catalogo)) {
      omitidas.push(`${categoria.nombre} (repite el catálogo de ${catalogo.categoria})`);
      continue;
    }
    usadosCatalogo.add(catalogo);
    if (categoria.estado !== 1) {
      omitidas.push(`${categoria.nombre} (categoría inactiva)`);
      continue;
    }

    let nuevos = 0;
    let existentes = 0;
    let presentaciones = 0;
    let unidades = 0;

    for (const [indice, producto] of catalogo.productos.entries()) {
      const codigo = `${catalogo.prefijo}-${String(indice + 1).padStart(3, '0')}`;
      const { rows } = await client.query(
        `SELECT id_producto FROM productos
          WHERE codigo = $1 OR (lower(nombre) = lower($2) AND categoria_id = $3)
          LIMIT 1`,
        [codigo, producto.nombre, categoria.id_categoria]
      );
      if (rows.length > 0) {
        existentes += 1;
        continue;
      }
      if (dryRun) {
        nuevos += 1;
        presentaciones += producto.presentaciones.length;
        unidades += producto.presentaciones.length * unidadesPorPresentacion;
        continue;
      }
      const creado = await crearProducto(
        catalogo,
        producto,
        codigo,
        categoria.id_categoria,
        indice,
        usados
      );
      nuevos += 1;
      presentaciones += creado.presentaciones;
      unidades += creado.unidades;
    }

    resumen.push({
      categoría: catalogo.categoria,
      productos_nuevos: nuevos,
      productos_existentes: existentes,
      presentaciones,
      unidades
    });
  }

  for (const catalogo of CATALOGOS) {
    if (!usadosCatalogo.has(catalogo)) {
      omitidas.push(`${catalogo.categoria} (no existe en la base)`);
    }
  }

  await client.query(dryRun ? 'ROLLBACK' : 'COMMIT');
  const totales = resumen.reduce(
    (acumulado, fila) => ({
      productos: acumulado.productos + fila.productos_nuevos,
      presentaciones: acumulado.presentaciones + fila.presentaciones,
      unidades: acumulado.unidades + fila.unidades
    }),
    { productos: 0, presentaciones: 0, unidades: 0 }
  );
  console.log(
    `${dryRun ? 'Simulación' : 'Seed aplicado'}: ${CATALOGOS.length} categorías, ${PRODUCTOS_POR_CATEGORIA} productos por categoría.`
  );
  console.table(resumen);
  console.log(
    `Productos nuevos: ${totales.productos}. Presentaciones: ${totales.presentaciones}. Unidades en bodega: ${totales.unidades}.`
  );
  if (omitidas.length > 0) console.log(`Categorías omitidas: ${omitidas.join(', ')}.`);
} catch (error) {
  await client.query('ROLLBACK').catch(() => {});
  console.error(error.message);
  process.exitCode = 1;
} finally {
  await client.end();
}
