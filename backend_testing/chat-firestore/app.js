function timestamp() {
    return firebase.firestore.Timestamp.fromDate(new Date());
}

function toggle_page(new_form) {
    new_form == 'login_form' && init_login_form();

    load_back_button(new_form);
    new_form = document.querySelector(`form#${new_form}`);


    all_forms = document.querySelectorAll('form');
    all_forms.forEach(form => {
        form.reset();
        form == new_form ? form.style.display = 'flex' : form.style.display = 'none';
    });
}

const message_tone = new Audio('/message-tone.mp3');

const back_button = document.querySelector('#back_button');
const title = document.querySelector('#title');
const chat_box = document.querySelector('#chat_box');
const match_input = document.querySelector('#match_input');

back_button.addEventListener('click', (e) => {
    e.preventDefault();
    title.innerText = '';
    chat_box.innerText = '';
    status.style.color = 'unset';
    toggle_page(back_button.dataset.value);
})

function load_back_button(this_form) {
    if (this_form == 'sign_up_form') {
        back_button.dataset.value = 'login_form';
    } else if (this_form == 'pick_match_form') {
        back_button.dataset.value = 'login_form';
    } else if (this_form == 'chat_form') {
        back_button.dataset.value = 'pick_match_form';
    }
}

function decipher_uuid(current_uuid) {
    const docRef = db.collection('users').doc(current_uuid);
    docRef.get().then(function (doc) {
        const name = doc.data().first_name;
        return name;
    }).catch(function (error) {
        console.log(error);
    });
}

// ==============================
// login_form
// ==============================

const uuid_input = document.querySelector('#uuid_input');
const login_button = document.querySelector('#login_button');
const sign_up_button = document.querySelector('#sign_up_button');

const status = document.querySelector('#status');

function init_login_form() {
    match_input.innerText = '';
    back_button.style.display = 'none';
    title.innerText = '';
    chat_box.innerText = '';
    status.innerText = 'Logged out';
    console.log('Logging out');

    login_button.addEventListener('click', (e) => {
        e.preventDefault();
        const current_uuid = uuid_input.value;

        const docRef = db.collection('users').doc(current_uuid);
        docRef.get().then(function (doc) {
            if (doc.exists) {
                status.style.color = 'unset';
                console.log(`Logged in as: '${current_uuid}'`);
                status.innerText = `Logged in as: '${current_uuid}'`;
                toggle_page('pick_match_form');
                init_pick_match_form(current_uuid);
            } else {
                status.innerText = `'${current_uuid}' is not a user!`;
                status.style.color = 'red';
            }
        }).catch(function (error) {
            console.log(error);
        });
    })

    sign_up_button.addEventListener('click', (e) => {
        e.preventDefault();
        toggle_page('sign_up_form');
        init_sign_up_form();
    })
}

init_login_form()

// ==============================
// sign_up_form
// ==============================

const sign_up_form = document.querySelector('#sign_up_form');
const add_account_button = document.querySelector('#add_account_button');

function init_sign_up_form() {
    back_button.style.display = 'unset';
    add_account_button.addEventListener('click', (e) => {
        e.preventDefault();
        create_user();
    })
}

function create_user() {
    const data = {
        first_name: first_name_input.value,
        last_name: last_name_input.value,
        age: age_input.value,
        gender: gender_input.value,
        account_created: timestamp()
    };
    db.collection('users').doc().set(data).then(function () {
        console.log('Account Created!');
        // sign_up_form.reset(); // Clear input(s)
    }).catch(function (error) {
        console.error(error);
    });
}

// ==============================
// pick_match_form
// ==============================

const pick_match_button = document.querySelector('#pick_match_button');
const pick_match_form = document.querySelector('#pick_match_form');

function init_pick_match_form(current_uuid) {
    back_button.style.display = 'flex';
    list_matches(current_uuid);
    pick_match_button.addEventListener('click', (e) => {
        e.preventDefault();
        const match_uuid = match_input.value;
        console.log(`Chatting with: ${match_uuid}`);
        toggle_page('chat_form');

        const thread_id = set_thread_id(current_uuid, match_uuid);
        init_chat_form(current_uuid, match_uuid);
        recall_chat(current_uuid, match_uuid, thread_id);
    })
}

function list_matches(current_uuid) {
    const doc = db.collection('users').doc(current_uuid).collection('matches');
    const observer = doc.onSnapshot(docSnapshot => {
        doc.get()
            .then(function (querySnapshot) {
                match_input.innerHTML = '';
                querySnapshot.forEach(function (doc) {
                    const element = `
                        <option value="${doc.id}">${doc.id}</option>
                    `
                    match_input.innerHTML += element;
                });
            })
            .catch(function (error) {
                console.log('Error getting documents: ', error);
            });
    }, err => {
        console.log(err);
    });
}

// ==============================
// chat_form
// ==============================

const message_input = document.querySelector('#message_input');
const send_button = document.querySelector('#send_button');

function init_chat_form(current_uuid, match_uuid) {
    send_button.addEventListener('click', (e) => {
        e.preventDefault();
        send_message(current_uuid, match_uuid);
    })
}

function send_message(current_uuid, match_uuid) {
    if (message_input.value) {

        const data = {
            content: message_input.value,
            from: current_uuid,
            to: match_uuid,
            when: timestamp()
        };
        db.collection('chats').doc('thread-' + thread_id).collection('messages').doc().set(data).then(function () {
            console.log('Message Sent!');
            chat_form.reset(); // Clear input(s)
        }).catch(function (error) {
            console.error(error);
        });

    }
}

function recall_chat(current_uuid, match_uuid, thread_id) {
    console.log('This Thread ID: ' + thread_id);

    title.innerText = match_uuid;
    chat_box.innerHTML = '';

    const doc = db.collection('chats').doc('thread-' + thread_id).collection('messages');
    doc.orderBy('when', 'asc') // Index Collection ID: 'chats'
        .get()
        .then(function (querySnapshot) {
            title.innerText = match_uuid;
            chat_box.innerHTML = '';
            querySnapshot.forEach(function (doc) {
                insert_message(current_uuid, match_uuid, doc);
            });
            scroll_to_bottom('tell');
        })
        .catch(function (error) {
            console.log('Error getting documents: ', error);
        });
    observe_chat(current_uuid, match_uuid, doc);
}

function observe_chat(current_uuid, match_uuid, doc) {
    const observer = doc.onCreate(docSnapshot => {
        doc.orderBy('when', 'asc') // Index Collection ID: 'chats'
            .get()
            .then(function (querySnapshot) {

                chat_query(current_uuid, match_uuid, doc);

                scroll_to_bottom('ask');
                play_tone();
            })
            .catch(function (error) {
                console.log('Error getting documents: ', error);
            });
    }, err => {
        console.log(`Encountered error: ${err}`);
    });
}

function insert_message(current_uuid, match_uuid, doc) {

    const content = (doc.id, ' => ', doc.data().content);
    const from = (doc.id, ' => ', doc.data().from);
    const time = (doc.id, ' => ', format_fs_tstamp(doc.data().when));

    const element = `
        <li class="message ${who_sent(from, current_uuid, match_uuid)}">
            <p>${content}</p>
            <p class="time">${time}</p>
        </li>
        `
    chat_box.innerHTML += element;
}

function play_tone() {
    const last_message = document.querySelector('.message:last-of-type');
    if (last_message.classList.contains('from_them')) {
        message_tone.play();
    }
}

function scroll_to_bottom(command) {
    if (command == 'ask') {
        if ((chat_box.scrollHeight - (chat_box.scrollTop + chat_box.clientHeight)) <= 500) {
            chat_box.scrollTo(0, chat_box.scrollHeight);
        }
    } else if (command == 'tell') {
        chat_box.scrollTo(0, chat_box.scrollHeight);
    }
}

function set_thread_id(uuid1, uuid2) {
    uuid1 > uuid2 ? thread_id = uuid1 + '-' + uuid2 : thread_id = uuid2 + '-' + uuid1;
    return thread_id;
}

function who_sent(from, current_uuid, match_uuid) {
    from == current_uuid ? sender = 'from_me' : sender = 'from_them';
    return sender;
}

function format_fs_tstamp(tstamp) {
    return moment(tstamp.toDate()).format("D/M/YY • h:mm a");
}

// Needs to do

// 1. Decipher names