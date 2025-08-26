## 🔑 SSH Подключение к серверам

### Быстрое подключение (алиасы)

**PowerShell:**
```powershell
# Сначала активируйте профиль (если нужно):
. $PROFILE

# Затем используйте алиасы:
monitoring   # Сервер мониторинга 95.111.252.29
optimus      # Сервер Оптимус 176.117.78.134
ultimate     # Сервер Ультимейт 193.169.188.9
mon          # Короткий алиас для мониторинга
opt          # Короткий алиас для Оптимуса
ult          # Короткий алиас для Ультимейта
```

**Bash / WSL:**
```bash
monitoring   # Сервер мониторинга 95.111.252.29
optimus      # Сервер Оптимус 176.117.78.134
ultimate     # Сервер Ультимейт 193.169.188.9
```

### Серверы

- **🟢 Мониторинг:** `95.111.252.29:22` - SSH ключ настроен ✅
- **🟡 Оптимус:** `176.117.78.134:22` - требует настройки SSH ключа
- **🟢 Ультимейт:** `193.169.188.9:41229` - SSH ключ настроен ✅

### SSH ключи

- **Единый ключ:** `~/.ssh/monitoring_key` (для всех серверов)
- **Исходный PPK:** `private_ssh_key_for_all_servers.ppk`
- **Пароль мониторинга:** `fr1daYTw1st` (экстренный доступ)

### Прямые команды

```bash
# Мониторинг
ssh -i ~/.ssh/monitoring_key root@95.111.252.29

# Оптимус
ssh -i ~/.ssh/optimus_key root@176.117.78.134

# Ультимейт
ssh -i ~/.ssh/ultimate_key -p 41229 root@193.169.188.9
```

---

## 🤖 n8n MCP Integration

### MCP Серверы (Model Context Protocol)

Claude CLI настроен для работы с n8n MCP v2.10.4:

```bash
# Доступные MCP инструменты
claude mcp list

# n8n MCP v2.10.4 - Latest Release (12 Aug 2025)
# - 534 доступных узла
# - 268 AI инструментов  
# - 88% покрытие документации
# - Совместимость с MCP June 2025 Spec
```

### Конфигурация n8n MCP

```json
{
  "n8n_mcp": {
    "type": "stdio",
    "command": "npx",
    "args": ["n8n-mcp@2.10.4"],
    "env": {
      "MCP_MODE": "stdio",
      "LOG_LEVEL": "error",
      "DISABLE_CONSOLE_OUTPUT": "true"
    }
  }
}
```

### Команды для работы с n8n

```bash
# Проверить версию n8n MCP
npx n8n-mcp@2.10.4 --version

# Получить статистику узлов
mcp__n8n-mcp__get_database_statistics

# Поиск узлов по ключевым словам
mcp__n8n-mcp__search_nodes

# Получить информацию о конкретном узле
mcp__n8n-mcp__get_node_info

# Валидация workflow
mcp__n8n-mcp__validate_workflow
```

### Использование в проектах

- **Автохимия AI чатбот:** `/n8n-implementation-guide.md`
- **Workflow автоматизация:** используй MCP инструменты для создания n8n workflow
- **AI Agent конфигурации:** автоматическая настройка узлов через MCP

---

## 🗄️ Supabase MCP Integration

### 🔗 Быстрое подключение к Supabase

**При запросе "подкл к supabase" или "подключиться к supabase через mcp":**

1. Проверить URL проекта: `mcp__supabase__get_project_url`
2. Показать список таблиц: `mcp__supabase__list_tables`
3. Подтвердить подключение к проекту `bvcgsavjmrvkxcetyeyz`

```bash
# Автоматические команды для быстрого подключения
mcp__supabase__get_project_url    # → https://bvcgsavjmrvkxcetyeyz.supabase.co
mcp__supabase__list_tables        # → показать структуру БД
```

### Доступная структура БД

**Таблицы проекта `bvcgsavjmrvkxcetyeyz`:**
- `documents` (с RLS) - content, metadata, embedding, fts
- `record_manager` (с RLS) - gdrive_file_id, hash  
- `record_manager_v2` (без RLS) - обновленная версия
- `documents_v2` (без RLS) - обновленная версия с векторами

### Конфигурация Supabase MCP

```json
{
  "supabase": {
    "type": "stdio", 
    "command": "npx",
    "args": ["-y", "@supabase/mcp-server-supabase@latest", "--project-ref=bvcgsavjmrvkxcetyeyz"],
    "env": {
      "SUPABASE_ACCESS_TOKEN": "sbp_3f582f7a367405bbcb209f991fafcf2651d95020"
    }
  }
}
```

### ⚠️ Типы токенов Supabase

| Тип токена | Формат | Использование |
|------------|--------|---------------|
| **JWT anon** | `eyJ...` | Frontend приложения |
| **JWT service_role** | `eyJ...` | Backend приложения |
| **Personal Access Token** | `sbp_...` | **MCP серверы** ✅ |

### 🔧 Получение Personal Access Token

1. Переходим в [Supabase Dashboard → Account → Access Tokens](https://supabase.com/dashboard/account/tokens)
2. Кликаем **"Create new token"**
3. Даем имя: `Claude CLI MCP`
4. Копируем токен формата `sbp_...` (показывается только один раз!)
5. Обновляем конфигурацию в `~/.claude.json`
```

### Команды для работы с Supabase

```bash
# Получить URL проекта
mcp__supabase__get_project_url

# Получить анонимный ключ
mcp__supabase__get_anon_key

# Список таблиц
mcp__supabase__list_tables

# Выполнить SQL запрос
mcp__supabase__execute_sql

# Применить миграцию
mcp__supabase__apply_migration

# Список Edge Functions
mcp__supabase__list_edge_functions

# Деплой Edge Function
mcp__supabase__deploy_edge_function

# Поиск в документации
mcp__supabase__search_docs

# Работа с ветками (development branches)
mcp__supabase__list_branches
mcp__supabase__create_branch
mcp__supabase__merge_branch

# Логи и мониторинг
mcp__supabase__get_logs
mcp__supabase__get_advisors
```

### Использование в проектах

- **База данных:** управление таблицами, миграциями, SQL запросами
- **Edge Functions:** серверная логика на Deno/TypeScript
- **Документация:** поиск по официальной документации Supabase
- **DevOps:** ветки разработки, логи, мониторинг безопасности

