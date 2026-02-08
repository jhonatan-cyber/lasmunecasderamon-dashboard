// Script para limpiar cache y forzar actualización de permisos
// Este script debe ser ejecutado en la consola del navegador

console.log('🧹 LIMPIEZA DE CACHE Y ACTUALIZACIÓN DE PERMISOS');
console.log('=' .repeat(80));

// 1. Limpiar localStorage
console.log('\n📋 1. Limpiando localStorage...');
const keysToRemove = [];
for (let i = 0; i < localStorage.length; i++) {
  const key = localStorage.key(i);
  if (key && (key.includes('permission') || key.includes('user') || key.includes('auth'))) {
    keysToRemove.push(key);
  }
}

keysToRemove.forEach(key => {
  console.log(`  🗑️ Eliminando: ${key}`);
  localStorage.removeItem(key);
});

// 2. Limpiar sessionStorage
console.log('\n📋 2. Limpiando sessionStorage...');
for (let i = 0; i < sessionStorage.length; i++) {
  const key = sessionStorage.key(i);
  if (key && (key.includes('permission') || key.includes('user') || key.includes('auth'))) {
    console.log(`  🗑️ Eliminando: ${key}`);
    sessionStorage.removeItem(key);
  }
}

// 3. Forzar recarga de permisos
console.log('\n📋 3. Forzando recarga de permisos...');
if (typeof window !== 'undefined' && window.dispatchEvent) {
  // Disparar evento de actualización de permisos
  window.dispatchEvent(new CustomEvent('permissions-updated', {
    detail: { force: true }
  }));
  
  console.log('  ✅ Evento permissions-updated disparado');
}

// 4. Recargar la página
console.log('\n📋 4. Recargando la página...');
console.log('  ⏱️ Recargando en 3 segundos...');

setTimeout(() => {
  console.log('  🔄 Recargando ahora...');
  window.location.reload(true);
}, 3000);

console.log('\n✅ Limpieza completada. La página se recargará automáticamente.');
console.log('\n📋 Instrucciones adicionales:');
console.log('  1. Después de la recarga, verifica que los permisos se carguen correctamente');
console.log('  2. Si el problema persiste, cierra sesión y vuelve a iniciar');
console.log('  3. Si aún así persiste, limpia el cache del navegador (Ctrl+Shift+R)');

// Exportar funciones para uso manual
window.clearPermissionsCache = function() {
  console.log('🧹 Limpiando cache de permisos...');
  
  // Limpiar localStorage
  const keysToRemove = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && (key.includes('permission') || key.includes('user') || key.includes('auth'))) {
      keysToRemove.push(key);
    }
  }
  keysToRemove.forEach(key => localStorage.removeItem(key));
  
  // Limpiar sessionStorage
  for (let i = 0; i < sessionStorage.length; i++) {
    const key = sessionStorage.key(i);
    if (key && (key.includes('permission') || key.includes('user') || key.includes('auth'))) {
      sessionStorage.removeItem(key);
    }
  }
  
  // Disparar evento
  window.dispatchEvent(new CustomEvent('permissions-updated', {
    detail: { force: true }
  }));
  
  console.log('✅ Cache de permisos limpiado');
};

window.refreshPermissions = function() {
  console.log('🔄 Refrescando permisos...');
  window.dispatchEvent(new CustomEvent('permissions-updated', {
    detail: { force: true }
  }));
  console.log('✅ Permisos refrescados');
};

console.log('\n🔧 Funciones disponibles:');
console.log('  - clearPermissionsCache() - Limpia todo el cache de permisos');
console.log('  - refreshPermissions() - Fuerza la recarga de permisos');
