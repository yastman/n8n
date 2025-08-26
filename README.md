## 🛠️ Технологический стек

### Core Components

| Компонент     | Версия     | Назначение                                 |
| ------------- | ---------- | ------------------------------------------ |
| **n8n**       | Enterprise | Оркестрация workflow, MCP интеграция       |
| **Redis 8.2** | RC         | Векторный поиск, семантическое кэширование |
| **Supabase**  | GA         | AI-оптимизированная база данных, хранилище |
| **Light RAG** | 2.0        | Гибридный поиск, мультимодальная обработка |
| **Grafana**   | Latest     | Мониторинг и аналитика                     |

### AI Components

| Технология | Модель                 | Назначение                     |
| ---------- | ---------------------- | ------------------------------ |
| **GPT-5**  | gpt-5, gpt-5-mini      | Генерация ответов, рассуждения |
| **Cohere** | Rerank v3, Embed v3    | Реранкинг, эмбеддинги          |
| **Ollama** | Llama 3.2 70B, Mixtral | Локальные модели               |
| **OpenAI** | text-embedding-3-large | Эмбеддинги                     |

### Инфраструктура

- **Контейнеризация**: Docker, Docker Compose
- **Прокси**: Nginx
- **База данных**: PostgreSQL 15 + pgvector 0.8.0
- **Мониторинг**: Prometheus + Grafana

## 🚀 Быстрый старт

### Предварительные требования

- VPS сервер: 4+ CPU, 16+ GB RAM, NVMe диск
- Docker и Docker Compose
- Доменное имя (для SSL)

### Установка

```bash
# 1. Клонируйте репозиторий
git clone https://github.com/your-username/ai-automation-stack.git
cd ai-automation-stack

# 2. Настройте переменные окружения
cp .env.example .env
# Отредактируйте .env с вашими ключами

# 3. Запустите сервисы
docker-compose up -d

# 4. Проверьте статус
docker-compose ps

# 5. Доступ к сервисам:
# n8n: http://localhost:5678
# Grafana: http://localhost:3000
```
