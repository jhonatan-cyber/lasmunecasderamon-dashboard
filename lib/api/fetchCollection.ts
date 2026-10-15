/** Reads list endpoints without treating failed responses as empty collections. */
export async function fetchCollection<T>(url: string, options?: RequestInit): Promise<T[]> {
  const response = await fetch(url, options);
  const result = await response.json();
  if (!response.ok || !result.success || !Array.isArray(result.data))
    throw new Error(result.message || 'No se pudieron cargar los datos.');
  return result.data;
}
