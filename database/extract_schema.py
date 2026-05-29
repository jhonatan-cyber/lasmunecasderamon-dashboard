import re

with open('lasmunecasderamon.sql', 'r', encoding='utf-8') as f:
    content = f.read()

# Find all CREATE TABLE statements
# Pattern to match: CREATE TABLE `name` ( ... ) ENGINE=
pattern = r'CREATE TABLE\s+(?:IF NOT EXISTS\s+)?`?(\w+)`?\s*\((.*?)\)\s*ENGINE='
tables = re.findall(pattern, content, re.DOTALL | re.IGNORECASE)

for table_name, columns_block in tables:
    print(f'=== {table_name} ===')
    for line in columns_block.split('\n'):
        line = line.strip()
        if not line:
            continue
        # Skip constraint definitions
        if line.startswith('--') or line.startswith('KEY ') or line.startswith('INDEX ') or line.startswith('UNIQUE ') or line.startswith('CONSTRAINT ') or line.startswith('PRIMARY KEY') or line.startswith('FOREIGN KEY') or line.upper().startswith('FULLTEXT'):
            continue
        
        # Extract column name: `col_name` type ...
        m = re.match(r'^`?(\w+)`?\s+(\w+)', line)
        if m:
            col_name = m.group(1)
            col_type = m.group(2)
            print(f'  {col_name} ({col_type})')
    print()
