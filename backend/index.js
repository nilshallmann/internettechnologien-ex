import express from 'express';

import DB from "./db.js";

const db = new DB();
await db.connect();

/** Zentrales Objekt für unsere Express-Applikation */
const app = express();

app.use(express.json());

// only used for testing
app.use(express.urlencoded());

app.use(express.static("../frontend"));

// Your code here
app.get('/todos', async (req, res) => {
    res.json(await db.queryAll());
});

app.post('/todos', async (req, res) => {
    res.status(201).json(await db.insert(req.body));
})

app.get('/todos/:id', async(req, res) => {
    const id = req.params.id;
    const todo = await db.queryById(id);
    if (todo) {
        res.json(todo);
    } else {
        res.status(404).send();
    }
})

app.delete('/todos/:id', async (req, res) => {
    const id = req.params.id;
    if (id) {
        res.status(201).json(await db.delete(id));
    } else {
        res.status(404).send();
    }
})

app.put('/todos/:id', async (req, res) => {
    const id = req.params.id;
    if (id) {
        res.status(201).json(await db.update(id, req.body));
    } else {
        res.status(404).send();
    }})

app.listen(3000);