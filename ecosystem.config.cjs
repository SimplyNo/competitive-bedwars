module.exports = {
  apps: [
    {
      name: "compbw",
      script: "bun",
      args: "run bot start:dev",
      log_date_format: "YYYY-MM-DD HH:mm Z",
      env: {
        FORCE_COLOR: "1"
      }
    },
    {
      name: "compbwminecraft",
      script: "bun",
      args: "run minecraft start:dev",
      log_date_format: "YYYY-MM-DD HH:mm Z",
      env: {
        FORCE_COLOR: "1"
      }
    },
    {
      name: "screensharing",
      script: "bun",
      args: "run screensharing start:dev",
      log_date_format: "YYYY-MM-DD HH:mm Z",
      env: {
        FORCE_COLOR: "1"
      }
    },
    {
      name: "workers",
      script: "bun",
      args: "run workers start:dev",
      log_date_format: "YYYY-MM-DD HH:mm Z",
      env: {
        FORCE_COLOR: "1"
      }
    }
  ]
}