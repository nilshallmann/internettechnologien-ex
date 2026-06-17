
import { MongoClient, ObjectId } from 'mongodb';

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/todos';
const MONGO_DB = process.env.MONGO_DB || 'todos';

let db = null;
let collection = null;
export default class DB {
    connect() {
        return MongoClient.connect(MONGO_URI)
            .then(function (client) {
                db = client.db(MONGO_DB);
                collection = db.collection('todos');
            })
    }

    queryAll() {
        return collection.find().toArray();
    }

    queryById(id) {
        return collection.findOne({_id: new ObjectId(id)});
    }

    update(id, todo) {
        // das id feld im todo ist noch ein string. Das darf natürlich nicht sein.
        //delete todo._id;
        todo._id = new ObjectId(todo._id);
        return collection.findOneAndReplace({_id: new ObjectId(id)}, todo);
    }

    delete(id) {
        const todo = collection.findOne({_id: new ObjectId(id)});
        collection.deleteOne(todo);
        return todo;
        //return collection.findOneAndDelete({_id: new ObjectId(id)});
    }

    insert(todo) {
        return collection.insertOne(todo)
        .then(result => {
            todo._id = new ObjectId(result.insertedId);
            return todo;
        })
    }
}
