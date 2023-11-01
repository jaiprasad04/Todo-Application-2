const express = require("express");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const path = require("path");
const format = require("date-fns/format");
const isMatch = require("date-fns/isMatch");
const isValid = require("date-fns/isValid");

const dbPath = path.join(__dirname, "todoApplication.db");
const app = express();
app.use(express.json());

let db = null;

const initializeDbAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3002, () => {
      console.log("Server Running at http://localhost:3002/");
    });
  } catch (error) {
    console.log(`DB Error: '${error.message}'`);
    process.exit(1);
  }
};

initializeDbAndServer();

const hasPriorityAndStatusProperties = (requestQuery) => {
  return (
    requestQuery.priority !== undefined && requestQuery.status !== undefined
  );
};

const hasPriorityProperty = (requestQuery) => {
  return requestQuery.priority !== undefined;
};

const hasStatusProperty = (requestQuery) => {
  return requestQuery.status !== undefined;
};

const hasCategoryAndStatusProperties = (requestQuery) => {
  return (
    requestQuery.category !== undefined && requestQuery.status !== undefined
  );
};

const hasCategoryAndPriorityProperties = (requestQuery) => {
  return (
    requestQuery.category !== undefined && requestQuery.priority !== undefined
  );
};

const hasSearchProperty = (requestQuery) => {
  return requestQuery.search_q !== undefined;
};

const hasCategoryProperty = (requestQuery) => {
  return requestQuery.category !== undefined;
};

const ans = (dbObject) => {
  return {
    id: dbObject.id,
    todo: dbObject.todo,
    category: dbObject.category,
    priority: dbObject.priority,
    status: dbObject.status,
    dueDate: dbObject.due_date,
  };
};

app.get("/todos/", async (request, response) => {
  let data = null;
  let getTodoQuery = "";
  const { search_q = "", priority, status, category } = request.query;

  switch (true) {
    // scenario 1
    // has only status
    case hasStatusProperty(request.query):
      if (status === "TO DO" || status === "IN PROGRESS" || status === "DONE") {
        getTodoQuery = `SELECT * FROM todo WHERE status = '${status}';`;
        data = await db.all(getTodoQuery);
        response.send(data.map((eachItem) => ans(eachItem)));
      } else {
        response.status(400);
        response.send("Invalid Todo Status");
      }
      break;
    // scenario 2
    // has only priority
    case hasPriorityProperty(request.query):
      if (priority === "HIGH" || priority === "MEDIUM" || priority === "LOW") {
        getTodoQuery = `SELECT * FROM todo WHERE priority = '${priority}';`;
        data = await db.all(getTodoQuery);
        response.send(data.map((eachItem) => ans(eachItem)));
      } else {
        response.status(400);
        response.send("Invalid Todo Priority");
      }
      break;
    // scenario 3
    // has priority and status
    case hasPriorityAndStatusProperties(request.query):
      if (priority === "HIGH" || priority === "MEDIUM" || priority === "LOW") {
        if (
          status === "TO DO" ||
          status === "IN PROGRESS" ||
          status === "DONE"
        ) {
          getTodoQuery = `SELECT * FROM todo WHERE status = '${status}' AND priority = '${priority}';`;
          data = await db.all(getTodoQuery);
          response.send(data.map((eachItem) => ans(eachItem)));
        } else {
          response.status(400);
          response.send("Invalid Todo Status");
        }
      } else {
        response.status(400);
        response.send("Invalid Todo Priority");
      }
      break;

    // scenario 4
    // has only search property
    case hasSearchProperty(request.query):
      getTodoQuery = `SELECT * FROM todo WHERE todo LIKE '%${search_q}%';`;
      data = await db.all(getTodoQuery);
      response.send(data.map((eachItem) => ans(eachItem)));
      break;

    // scenario 5
    // has category and status
    case hasCategoryAndStatusProperties(request.query):
      if (
        category === "WORK" ||
        category === "HOME" ||
        category === "LEARNING"
      ) {
        if (
          status === "TO DO" ||
          status === "IN PROGRESS" ||
          status === "DONE"
        ) {
          getTodoQuery = `SELECT * FROM todo WHERE category = '${category}' AND status = '${status}';`;
          data = await db.all(getTodoQuery);
          response.send(data.map((eachItem) => ans(eachItem)));
        } else {
          response.status(400);
          response.send("Invalid Todo Status");
        }
      } else {
        response.status(400);
        response.send("Invalid Todo Category");
      }
      break;

    // scenario 6
    // has only category
    case hasCategoryProperty(request.query):
      if (
        category === "WORK" ||
        category === "HOME" ||
        category === "LEARNING"
      ) {
        getTodoQuery = `SELECT * FROM todo WHERE category = '${category}';`;
        data = await db.all(getTodoQuery);
        response.send(data.map((eachItem) => ans(eachItem)));
      } else {
        response.status(400);
        response.send("Invalid Todo Category");
      }
      break;

    // scenario 7
    // has both category and priority
    case hasCategoryAndPriorityProperties(request.query):
      if (
        category === "WORK" ||
        category === "HOME" ||
        category === "LEARNING"
      ) {
        if (
          priority === "HIGH" ||
          priority === "MEDIUM" ||
          priority === "LOW"
        ) {
          getTodoQuery = `SELECT * FROM todo WHERE category = '${category}' AND priority = '${priority}';`;
          data = await db.all(getTodoQuery);
          response.send(data.map((eachItem) => ans(eachItem)));
        } else {
          response.status(400);
          response.send("Invalid Todo Priority");
        }
      } else {
        response.status(400);
        response.send("Invalid Todo Category");
      }
      break;

    default:
      getTodoQuery = `SELECT * FROM todo;`;
      data = await db.all(getTodoQuery);
      response.send(data.map((eachItem) => ans(eachItem)));
      break;
  }
});

app.get("/todos/:todoId/", async (request, response) => {
  const { todoId } = request.params;
  const getTodoQuery = `SELECT * FROM todo WHERE id = ${todoId};`;
  const todo = await db.get(getTodoQuery);
  response.send(ans(todo));
});

app.get("/agenda/", async (request, response) => {
  const { date } = request.query;
  if (isMatch(date, "yyyy-MM-dd")) {
    const newDate = format(new Date(date), "yyyy-MM-dd");
    // console.log(newDate);
    const requestQuery = `SELECT * FROM todo WHERE due_date = '${newDate}';`;
    const result = await db.all(requestQuery);
    response.send(result.map((eachItem) => ans(eachItem)));
  } else {
    response.status(400);
    response.send("Invalid Due Date");
  }
});

app.post("/todos/", async (request, response) => {
  const { id, todo, priority, status, category, dueDate } = request.body;
  if (priority === "HIGH" || priority === "LOW" || priority === "MEDIUM") {
    if (status === "TO DO" || status === "IN PROGRESS" || status === "DONE") {
      if (
        category === "WORK" ||
        category === "HOME" ||
        category === "LEARNING"
      ) {
        if (isMatch(dueDate, "yyyy-MM-dd")) {
          const postNewDueDate = format(new Date(dueDate), "yyyy-MM-dd");
          const postTodoQuery = `
                INSERT INTO
                    todo(id, todo, category, priority, status, due_date)
                VALUES 
                    ('${id}', '${todo}', '${category}', '${priority}', '${status}', '${postNewDueDate}');`;

          await db.run(postTodoQuery);
          response.send("Todo Successfully Added");
        } else {
          response.status(400);
          response.send("Invalid Due Date");
        }
      } else {
        response.status(400);
        response.send("Invalid Todo Category");
      }
    } else {
      response.status(400);
      response.send("Invalid Todo Status");
    }
  } else {
    response.status(400);
    response.send("Invalid Todo Priority");
  }
});

app.put("/todos/:todoId/", async (request, response) => {
  const { todoId } = request.params;
  let updateColumn = "";
  const requestBody = request.body;
  const previousTodoQuery = `SELECT * FROM todo WHERE id = ${todoId};`;
  const previousTodo = await db.get(previousTodoQuery);
  const {
    todo = previousTodo.todo,
    priority = previousTodo.priority,
    status = previousTodo.status,
    category = previousTodo.category,
    dueDate = previousTodo.dueDate,
  } = request.body;
  let updateTodoQuery;

  switch (true) {
    case requestBody.status !== undefined:
      if (status === "TO DO" || status === "IN PROGRESS" || status === "DONE") {
        updateTodoQuery = `
                UPDATE 
                  todo
                SET 
                  todo = '${todo}',
                  priority = '${priority}',
                  status = '${status}',
                  category = '${category}',
                  due_date = '${dueDate}'
                WHERE
                  id = ${todoId}`;
        await db.run(updateTodoQuery);
        response.send("Status Updated");
      } else {
        response.status(400);
        response.send("Invalid Todo Status");
      }
      break;
    case requestBody.priority !== undefined:
      if (priority === "HIGH" || priority === "LOW" || priority === "MEDIUM") {
        updateTodoQuery = `
                UPDATE 
                  todo
                SET 
                  todo = '${todo}',
                  priority = '${priority}',
                  status = '${status}',
                  category = '${category}',
                  due_date = '${dueDate}'
                WHERE
                  id = ${todoId}`;
        await db.run(updateTodoQuery);
        response.send("Priority Updated");
      } else {
        response.status(400);
        response.send("Invalid Todo Priority");
      }
      break;

    case requestBody.todo !== undefined:
      updateTodoQuery = `
            UPDATE 
              todo
            SET 
                todo = '${todo}',
                priority = '${priority}',
                status = '${status}',
                category = '${category}',
                due_date = '${dueDate}'
            WHERE
                id = ${todoId}`;
      await db.run(updateTodoQuery);
      response.send("Todo Updated");

      break;

    case requestBody.category !== undefined:
      if (
        category === "WORK" ||
        category === "HOME" ||
        category === "LEARNING"
      ) {
        updateTodoQuery = `
                UPDATE 
                  todo
                SET 
                  todo = '${todo}',
                  priority = '${priority}',
                  status = '${status}',
                  category = '${category}',
                  due_date = '${dueDate}'
                WHERE
                  id = ${todoId};`;
        await db.run(updateTodoQuery);
        response.send("Category Updated");
      } else {
        response.status(400);
        response.send("Invalid Todo Category");
      }
      break;
    case requestBody.dueDate !== undefined:
      if (isMatch(dueDate, "yyyy-MM-dd")) {
        const newDueDate = format(new Date(dueDate), "yyyy-MM-dd");
        updateTodoQuery = `
            UPDATE 
                  todo
                SET 
                  todo = '${todo}',
                  priority = '${priority}',
                  status = '${status}',
                  category = '${category}',
                  due_date = '${dueDate}'
                WHERE
                  id = ${todoId};`;
        await db.run(updateTodoQuery);
        response.send("Due Date Updated");
      } else {
        response.status(400);
        response.send("Invalid Due Date");
      }
      break;
  }
});

app.delete("/todos/:todoId/", async (request, response) => {
  const { todoId } = request.params;
  const deleteTodoQuery = `
    DELETE FROM
      todo
    WHERE 
      id = ${todoId};`;

  await db.run(deleteTodoQuery);
  response.send("Todo Deleted");
});

module.exports = app;
