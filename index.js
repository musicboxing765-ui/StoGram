const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

let users = new Map(); 

app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="ru">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
        <title>StoGram v2.0</title>
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css">
        <style>
          :root { --bg: #0e1621; --side: #17212b; --text: #ffffff; --accent: #5288c1; --drawer-bg: #1c242d; --input-bg: #242f3d; --msg-out: #2b5278; --msg-in: #182533; }
          * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, sans-serif; }
          body { background: var(--bg); color: var(--text); height: 100vh; display: flex; flex-direction: column; overflow: hidden; }

          /* Регистрация */
          #reg-screen { position: fixed; inset: 0; background: var(--bg); z-index: 9999; display: flex; align-items: center; justify-content: center; padding: 20px; }
          .reg-card { background: var(--side); padding: 30px; border-radius: 15px; width: 100%; max-width: 360px; text-align: center; border: 1px solid #222; }
          .reg-card input { width: 100%; padding: 14px; margin-bottom: 12px; border-radius: 10px; border: none; background: var(--input-bg); color: white; outline: none; }
          .reg-btn { width: 100%; padding: 14px; border-radius: 10px; border: none; background: var(--accent); color: white; font-weight: bold; cursor: pointer; }

          /* Основная сетка */
          #app-interface { display: none; flex: 1; width: 100%; height: 100%; overflow: hidden; position: relative; }
          .sidebar { width: 100%; max-width: 380px; background: var(--side); display: flex; flex-direction: column; border-right: 1px solid #000; }
          
          /* Поиск и Навигация */
          .top-nav { padding: 10px 15px; display: flex; align-items: center; gap: 10px; background: var(--side); }
          .search-bar { flex: 1; background: var(--input-bg); border-radius: 20px; padding: 8px 15px; display: flex; align-items: center; }
          .search-bar input { background: transparent; border: none; color: white; outline: none; width: 100%; margin-left: 10px; }

          /* Список чатов */
          .chat-list { flex: 1; overflow-y: auto; }
          .chat-item { padding: 12px 15px; display: flex; align-items: center; gap: 12px; cursor: pointer; border-bottom: 1px solid rgba(0,0,0,0.1); }
          .avatar { width: 48px; height: 48px; border-radius: 50%; background: var(--accent); display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 1.2em; }

          /* Окно чата */
          .main-chat { flex: 1; display: none; flex-direction: column; background: var(--bg); position: relative; }
          .main-chat.active { display: flex; }
          .chat-head { padding: 10px 20px; background: var(--side); border-bottom: 1px solid #000; display: flex; align-items: center; gap: 15px; }
          #messages { flex: 1; padding: 15px; overflow-y: auto; background: url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png'); background-size: cover; display: flex; flex-direction: column; gap: 8px; }

          /* Пузыри */
          .bubble { padding: 8px 14px; border-radius: 12px; max-width: 80%; position: relative; font-size: 0.95em; line-height: 1.4; }
          .sent { background: var(--msg-out); align-self: flex-end; border-bottom-right-radius: 2px; }
          .received { background: var(--msg-in); align-self: flex-start; border-bottom-left-radius: 2px; }
          .time { font-size: 0.7em; opacity: 0.6; margin-left: 10px; float: right; margin-top: 4px; }

          /* Поле ввода */
          .input-area { padding: 10px 15px; background: var(--side); display: flex; align-items: center; gap: 10px; }
          .input-area input { flex: 1; background: transparent; border: none; color: white; outline: none; padding: 10px; }

          /* Нижнее меню (Интерфейс снизу) */
          .bottom-bar { height: 60px; background: var(--side); border-top: 1px solid #000; display: flex; justify-content: space-around; align-items: center; }
          .nav-item { text-align: center; color: #808d9a; cursor: pointer; font-size: 0.8em; flex: 1; padding: 10px; }
          .nav-item.active { color: var(--accent); }
          .nav-item i { font-size: 1.4em; margin-bottom: 4px; }

          /* Шторка */
          #overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.7); z-index: 1000; display: none; }
          .drawer { position: fixed; top: 0; left: -280px; width: 280px; height: 100%; background: var(--drawer-bg); z-index: 1001; transition: 0.3s; }
          .drawer.open { left: 0; }
          .drawer-header { padding: 20px; background: linear-gradient(135deg, #2b5278 0%, #17212b 100%); height: 140px; display: flex; flex-direction: column; justify-content: flex-end; }

          @media (max-width: 768px) {
            .sidebar.mobile-hide { display: none; }
            .main-chat.active { position: absolute; width: 100%; height: 100%; z-index: 100; }
          }
        </style>
      </head>
      <body>
        <div id="reg-screen">
          <div class="reg-card">
            <h2 style="margin-bottom:20px; color:var(--accent)">StoGram</h2>
            <input type="text" id="reg-name" placeholder="@username">
            <input type="text" id="reg-country" placeholder="Страна">
            <button class="reg-btn" onclick="auth()">Войти</button>
          </div>
        </div>

        <div id="app-interface">
          <div id="overlay" onclick="toggleDrawer(false)"></div>
          <div class="drawer" id="drawer">
            <div class="drawer-header">
              <div class="avatar" id="p-avatar" style="border:2px solid #fff; margin-bottom:10px">?</div>
              <div id="p-name" style="font-weight:bold"></div>
              <div id="p-sub" style="font-size:0.8em; color:rgba(255,255,255,0.6)"></div>
            </div>
            <div style="padding:15px; cursor:pointer" onclick="logout()"><i class="fas fa-sign-out-alt"></i> Выйти</div>
          </div>

          <div class="sidebar" id="sidebar">
            <div class="top-nav">
              <i class="fas fa-bars" onclick="toggleDrawer(true)" style="cursor:pointer"></i>
              <div class="search-bar">
                <input type="text" id="search" placeholder="Поиск @юзера..." oninput="doSearch()">
              </div>
            </div>
            <div class="chat-list" id="chat-list-ui"></div>
            <div class="bottom-bar">
              <div class="nav-item active"><i class="fas fa-comment"></i><br>Чаты</div>
              <div class="nav-item" onclick="toggleDrawer(true)"><i class="fas fa-cog"></i><br>Настройки</div>
            </div>
          </div>

          <div class="main-chat" id="chat-window">
            <div class="chat-head">
              <i class="fas fa-arrow-left" onclick="closeChat()" style="cursor:pointer"></i>
              <div class="avatar" id="t-avatar" style="width:35px; height:35px; font-size:0.8em; margin-left:10px">?</div>
              <div id="t-name" style="font-weight:bold; margin-left:10px"></div>
            </div>
            <div id="messages"></div>
            <form class="input-area" id="msg-form">
              <input id="m-input" placeholder="Написать сообщение..." autocomplete="off">
              <button type="submit" style="background:none; border:none; color:var(--accent); font-size:1.4em; cursor:pointer"><i class="fas fa-paper-plane"></i></button>
            </form>
          </div>
        </div>

        <script src="/socket.io/socket.io.js"></script>
        <script>
          const socket = io();
          let myName = "", activeChat = "";
          let history = JSON.parse(localStorage.getItem('chat_history') || '{}');

          function auth() {
            const name = document.getElementById('reg-name').value.trim();
            const country = document.getElementById('reg-country').value.trim();
            if(!name.startsWith('@')) return alert('Ник должен начинаться с @');
            socket.emit('auth', { name, country }, (res) => {
              if(res.status === 'ok') {
                localStorage.setItem('sto_user', JSON.stringify({name, country}));
                location.reload();
              }
            });
          }

          function toggleDrawer(o) {
            document.getElementById('drawer').classList.toggle('open', o);
            document.getElementById('overlay').style.display = o ? 'block' : 'none';
          }

          function doSearch() {
            const q = document.getElementById('search').value.trim();
            if(q.length > 1) socket.emit('search', q);
          }

          socket.on('search_res', users => {
            const list = document.getElementById('chat-list-ui');
            list.innerHTML = '<div style="padding:10px; font-size:0.7em; color:gray">ГЛОБАЛЬНЫЙ ПОИСК</div>';
            users.filter(u => u !== myName).forEach(u => addChatUI(u, true));
          });

          function addChatUI(user, isSearch = false) {
            if (document.querySelector(\`[data-user="\${user}"]\`) && !isSearch) return;
            const div = document.createElement('div');
            div.className = 'chat-item';
            div.dataset.user = user;
            div.innerHTML = \`<div class="avatar">\${user[1].toUpperCase()}</div>
                             <div style="flex:1; margin-left:10px"><b>\${user}</b><br><small id="l-\${user}" style="color:gray">Нажмите, чтобы открыть</small></div>\`;
            div.onclick = () => openChat(user);
            const list = document.getElementById('chat-list-ui');
            isSearch ? list.appendChild(div) : list.prepend(div);
          }

          function openChat(user) {
            activeChat = user;
            document.getElementById('chat-window').classList.add('active');
            document.getElementById('sidebar').classList.add('mobile-hide');
            document.getElementById('t-name').innerText = user;
            document.getElementById('t-avatar').innerText = user[1].toUpperCase();
            renderMessages();
            toggleDrawer(false);
          }

          function closeChat() {
            document.getElementById('chat-window').classList.remove('active');
            document.getElementById('sidebar').classList.remove('mobile-hide');
            activeChat = "";
          }

          document.getElementById('msg-form').onsubmit = (e) => {
            e.preventDefault();
            const text = document.getElementById('m-input').value.trim();
            if(text && activeChat) {
              const time = new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
              const msg = { to: activeChat, text, time, type: 'sent' };
              socket.emit('private_msg', msg);
              saveMsg(activeChat, msg);
              addMsgUI(text, 'sent', time);
              document.getElementById('m-input').value = '';
              document.getElementById('l-'+activeChat).innerText = 'Вы: ' + text;
            }
          };

          socket.on('push_msg', (data) => {
            addChatUI(data.from);
            const msg = { from: data.from, text: data.text, time: data.time, type: 'received' };
            saveMsg(data.from, msg);
            document.getElementById('l-'+data.from).innerText = data.text;
            if(activeChat === data.from) addMsgUI(data.text, 'received', data.time);
          });

          function saveMsg(chat, msg) {
            if(!history[chat]) history[chat] = [];
            history[chat].push(msg);
            localStorage.setItem('chat_history', JSON.stringify(history));
          }

          function renderMessages() {
            const box = document.getElementById('messages');
            box.innerHTML = '';
            if(history[activeChat]) {
              history[activeChat].forEach(m => addMsgUI(m.text, m.type, m.time));
            }
          }

          function addMsgUI(text, type, time) {
            const div = document.createElement('div');
            div.className = 'bubble ' + type;
            div.innerHTML = \`\${text}<span class="time">\${time}</span>\`;
            document.getElementById('messages').appendChild(div);
            document.getElementById('messages').scrollTop = document.getElementById('messages').scrollHeight;
          }

          window.onload = () => {
            const saved = localStorage.getItem('sto_user');
            if(saved) {
              const p = JSON.parse(saved);
              socket.emit('auth', p, (res) => {
                if(res.status === 'ok') {
                  myName = p.name;
                  document.getElementById('reg-screen').style.display = 'none';
                  document.getElementById('app-interface').style.display = 'flex';
                  document.getElementById('p-name').innerText = p.name;
                  document.getElementById('p-sub').innerText = p.country || 'StoGram User';
                  document.getElementById('p-avatar').innerText = p.name[1].toUpperCase();
                  // Загрузка существующих чатов из истории
                  Object.keys(history).forEach(u => addChatUI(u));
                }
              });
            }
          };
          function logout() { localStorage.clear(); location.reload(); }
        </script>
      </body>
    </html>
  `);
});

io.on('connection', s => {
  s.on('auth', (d, cb) => {
    users.set(d.name, s.id); s.username = d.name; cb({status:'ok'});
  });
  s.on('search', q => {
    const found = Array.from(users.keys()).filter(n => n.includes(q));
    s.emit('search_res', found);
  });
  s.on('private_msg', d => {
    const targetId = users.get(d.to);
    if(targetId) io.to(targetId).emit('push_msg', { from: s.username, text: d.text, time: d.time });
  });
  s.on('disconnect', () => { if(s.username) users.delete(s.username); });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => console.log('StoGram Engine Started'));
