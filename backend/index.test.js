import { app, server, db } from './index.js';
import request from 'supertest';
import getAuthToken from './utils.js';

let expressServer, token;

beforeAll(async () => {
    expressServer = await server; // Ensure the server is started before tests
    console.log("Server started for testing");
    token = await getAuthToken();
    console.log("Keycloak token retrieved:", token);
});

afterAll(async () => {
    expressServer.close()
    db.close()
});

describe('GET /todos', () => {
    it('should return a list of todos', async () => {
        const response = await request(app)
        .get('/todos')
        .auth(token, {type: 'bearer'});
        expect(response.statusCode).toBe(200);
        expect(response.body).toBeInstanceOf(Array);
    });
});

describe('POST /todos', () => {
    it('should create a new todo', async () => {
        const newTodo = { title: 'Test Todo', status: 'needs-action' };
        const response = await request(app)
            .post('/todos')
            .auth(token, {type: 'bearer'})
            .send(newTodo);
        expect(response.statusCode).toBe(201);
        expect(response.body).toHaveProperty('_id');
        expect(response.body.title).toBe(newTodo.title);
    });
});

describe('DELETE /todos/:id', () => {
    it('should delete a todo', async () => {
        // First, create a new todo to delete
        const newTodo = { title: 'Todo to Delete', status: 'needs-action' };
        const createResponse = await request(app)
            .post('/todos')
            .auth(token, {type: 'bearer'})
            .send(newTodo);
        const todoId = createResponse.body._id;

        // Now, delete the created todo
        const deleteResponse = await request(app)
            .delete(`/todos/${todoId}`)
            .auth(token, {type: 'bearer'});
        expect(deleteResponse.statusCode).toBe(201);

        // Verify that the todo is deleted
        const getResponse = await request(app)
            .get(`/todos/${todoId}`)
            .auth(token, {type: 'bearer'});
        expect(getResponse.statusCode).toBe(403); // Expecting 403 since the todo should not be accessible after deletion
    });
});

describe('Delete non-existing todo', () => {
    it('should return 403 when trying to delete a non-existing todo', async () => {
        const nonExistingId = '000000000000000000000000'; // An ID that does not exist
        const response = await request(app)
            .delete(`/todos/${nonExistingId}`)
            .auth(token, {type: 'bearer'});
        expect(response.statusCode).toBe(403); // The delete endpoint returns 403 even if the todo does not exist
    });
});

describe('Edit todo', () => {
    it('should edit an existing todo', async () => {
        // First, create a new todo to edit
        const newTodo = { title: 'Todo to Edit', status: 'needs-action' };
        const createResponse = await request(app)
            .post('/todos')
            .auth(token, {type: 'bearer'})
            .send(newTodo);
        const todoId = createResponse.body._id;

        // Now, edit the created todo
        const updatedTodo = { _id: todoId, title: 'Edited Todo', status: 'completed' };
        const editResponse = await request(app)
            .put(`/todos/${todoId}`)
            .auth(token, {type: 'bearer'})
            .send(updatedTodo);
        expect(editResponse.statusCode).toBe(201);

        // Verify that the todo is updated
        const getResponse = await request(app)
            .get(`/todos/${todoId}`)
            .auth(token, {type: 'bearer'});
        expect(getResponse.statusCode).toBe(200);
        expect(getResponse.body.title).toBe(updatedTodo.title);
        expect(getResponse.body.status).toBe(updatedTodo.status);
    });
});