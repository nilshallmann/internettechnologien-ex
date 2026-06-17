const url = "https://ominous-giggle-x5vjp5q746r4cv656-3000.app.github.dev/todos"
const TODOS = []

async function fetchTodos() {
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`no bing chilling: ${response.status}`);
        }

        const temp = await response.json();

        console.log(temp)

        temp.forEach(todo => TODOS.push(todo));


    } catch (error) {
        console.error(error.message);
    }
}

function deleteTodo(id) {
    const index = TODOS.findIndex(todo => todo._id === id)
    if (index !== -1) {
        console.log(id);
        fetch(`${url}/${id}`, { method: "DELETE" });
        TODOS.splice(index, 1);
    }

    render()
}

function editTodo(id) {
    const index = TODOS.findIndex(todo => todo._id === id)
    if (index !== -1) {
        const title = todoarea.querySelector(`h3[id="h3-${id}"]`);
        const status = todoarea.querySelector(`.status[id="st-${id}"]`);
        const duedate = todoarea.querySelector(`.duedate[id="dd-${id}"]`);

        status.disabled = !status.disabled;
        duedate.disabled = !duedate.disabled;

        if (status.disabled) {
            TODOS[index] = { _id: id, title: title.textContent, due: duedate.value, status: status.value };
            fetch(
                `${url}/${id}`,
                {
                    method: "PUT",
                    body: JSON.stringify(TODOS[index]),
                    headers: { "Content-Type": "application/json" }
                }
            );
            render();
        }
    }

    //render()
}

function render() {
    const todoarea = document.getElementById("todoarea");
    Array.from(todoarea.children).forEach(c => c.remove());

    TODOS.forEach(todo => {
        /*todoarea.insertAdjacentHTML("beforeend", `
            <div class="todo" data-id="${todo.id}" data-status="${todo.status}">
            <h3>${todo.title}</h3>
            <p>Fällig: ${new Date(todo.due)}</p>
            <p>Status: ${todo.status}</p>
            </div>
        `);*/

        const div = document.createElement("div");
        const title = document.createElement("h3");
        const duedate = document.createElement("input");
        const status = document.createElement("select");

        div.id = `data-id=${todo._id}`;
        div.className = "todo";
        div.value = `data-status="${todo.status}"`

        title.id = `h3-${todo._id}`;
        title.textContent = todo.title;

        duedate.type = "datetime-local";
        // todo: rework this date stuff
        duedate.value = todo.due.slice(0, 16);
        duedate.className = "duedate";
        duedate.id = `dd-${todo._id}`;
        duedate.disabled = true;


        const opts = [{ value: "needs-action", textContent: "Zu tun" }, { value: "completed", textContent: "Erledigt" }, { value: "in-process", textContent: "In Bearbeitung" }, { value: "cancelled", textContent: "Annuliert" }]


        opts.forEach(element => {
            const option = document.createElement("option");
            option.value = element.value;
            option.textContent = element.textContent;
            status.appendChild(option);
        });

        status.value = todo.status;
        status.className = "status"
        status.id = `st-${todo._id}`;
        status.disabled = true;

        const appendable = div; //todoarea.querySelector(`[data-id="${todo.id}"]`);
        appendable.appendChild(title);
        appendable.appendChild(status);
        appendable.appendChild(duedate);


        const todoElement = appendable;//todoarea.querySelector(`[data-id="${todo.id}"]`);

        const deletebtn = document.createElement('button');
        deletebtn.textContent = 'Löschen';
        deletebtn.addEventListener('click', () => deleteTodo(todo._id));
        todoElement.appendChild(deletebtn);

        const editbtn = document.createElement('button');
        editbtn.textContent = 'Editieren';
        editbtn.addEventListener('click', () => editTodo(todo._id));
        todoElement.appendChild(editbtn);

        todoarea.appendChild(div);
    });

}

fetchTodos().then(render)