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
        <title>StoGram Ultra</title>
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css">
        <style>
          :root { --bg: #0e1621; --side: #17212b; --text: #ffffff; --accent: #5288c1; --drawer-bg: #1c242d; --input-bg: #242f3d; --msg-out: #2b5278; --msg-in: #182533; }
          * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, sans-serif; }
          body { background: var(--bg); color: var(--text); height: 100vh; display: flex; flex-direction: column; overflow: hidden; }

          #reg-screen { position: fixed; inset: 0; background: var(--bg); z-index: 9999; display: flex; align-items: center; justify-content: center; padding: 20px; }
          .reg-card { background: var(--side); padding: 30px; border-radius: 15px; width: 100%; max-width: 360px; text-align: center; }
          .reg-card input { width: 100%; padding: 14px; margin-bottom: 12px; border-radius: 10px; border: none; background: var(--input-bg); color: white; outline: none; }
          .reg-btn { width: 100%; padding: 14px; border-radius: 10px; border: none; background: var(--accent); color: white; font-weight: bold; cursor: pointer; }

          #app-interface { display: none; flex: 1; width: 100%; height: 100%; overflow: hidden; position: relative; }
          .sidebar { width: 100%; max-width: 380px; background: var(--side); display: flex; flex-direction: column; border-right: 1px solid #000; }
          
          .top-nav { padding: 10px 15px; display: flex; align-items: center; gap: 10px; }
          .search-bar { flex: 1; background: var(--input-bg); border-radius: 20px; padding: 8px 15px; display: flex; align-items: center; }
          .search-bar input { background: transparent; border: none; color: white; outline: none; width: 100%; }

          .chat-list { flex: 1; overflow-y: auto; }
          .chat-item { padding: 12px 15px; display: flex; align-items: center; gap: 12px; cursor: pointer; position: relative; }
          .avatar { width: 48px; height: 48px; border-radius: 50%; background: var(--accent); display: flex; align-items: center; justify-content: center; font-weight: bold; flex-shrink:0; }
          .online-dot { width: 12px; height: 12px; background: #4CAF50; border-radius: 50%; position: absolute; left: 45px; bottom: 12px; border: 2px solid var(--side); display: none; }

          .main-chat { flex: 1; display: none; flex-direction: column; background: var(--bg); position: relative; }
          .main-chat.active { display: flex; }
          .chat-head { padding: 10px 20px; background: var(--side); border-bottom: 1px solid #000; display: flex; align-items: center; gap: 12px; }
          #typing-status { font-size: 0.8em; color: var(--accent); display: none; }

          #messages { flex: 1; padding: 15px; overflow-y: auto; background: url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png'); display: flex; flex-direction: column; gap: 8px; }
          .bubble { padding: 8px 14px; border-radius: 12px; max-width: 80%; position: relative; cursor: pointer; transition: 0.2s; }
          .bubble:active { opacity: 0.7; }
          .sent { background: var(--msg-out); align-self: flex-end; border-bottom-right-radius: 2px; }
          .received { background: var(--msg-in); align-self: flex-start; border-bottom-left-radius: 2px; }
          .time { font-size: 0.7em; opacity: 0.5; margin-left: 10px; float: right; margin-top: 4px; }

          .input-area { padding: 10px 15px; background: var(--side); display: flex; align-items: center; gap: 10px; }
          .input-area input { flex: 1; background: transparent; border: none; color: white; outline: none; padding: 10px; }

          .bottom-bar { height: 60px; background: var(--side); border-top: 1px solid #000; display: flex; justify-content: space-around; align-items: center; }
          .nav-item { text-align: center; color: #808d9a; cursor: pointer; font-size: 0.75em; flex: 1; }
          .nav-item.active { color: var(--accent); }

          #overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.7); z-index: 1000; display: none; }
          .drawer { position: fixed; top: 0; left: -280px; width: 280px; height: 100%; background: var(--drawer-bg); z-index: 1001; transition: 0.3s; }
          .drawer.open { left: 0; }
          .drawer-header { padding: 20px; background: linear-gradient(135deg, #2b5278 0%, #17212b 100%); height: 140px; display: flex; flex-direction: column; justify-content: flex-end; }

          @media (max-width: 768px) { .sidebar.mobile-hide { display: none; } .main-chat.active { position: absolute; width: 100%; height: 100%; z-index: 100; } }
        </style>
      </head>
      <body>
        <div id="reg-screen"><div class="reg-card"><h2>StoGram</h2><input type="text" id="reg-name" placeholder="@username"><input type="text" id="reg-country" placeholder="Страна"><button class="reg-btn" onclick="auth()">Войти</button></div></div>

        <div id="app-interface">
          <div id="overlay" onclick="toggleDrawer(false)"></div>
          <div class="drawer" id="drawer">
            <div class="drawer-header"><div class="avatar" id="p-avatar" style="border:2px solid #fff; margin-bottom:10px">?</div><div id="p-name" style="font-weight:bold"></div><div id="p-sub" style="font-size:0.8em; opacity:0.7"></div></div>
            <div style="padding:15px" onclick="logout()">Выход</div>
          </div>

          <div class="sidebar" id="sidebar">
            <div class="top-nav"><i class="fas fa-bars" onclick="toggleDrawer(true)"></i><div class="search-bar"><input type="text" id="search" placeholder="Поиск..." oninput="doSearch()"></div></div>
            <div class="chat-list" id="chat-list-ui"></div>
            <div class="bottom-bar">
              <div class="nav-item active"><i class="fas fa-comment fa-lg"></i><br>Чаты</div>
              <div class="nav-item" onclick="toggleDrawer(true)"><i class="fas fa-cog fa-lg"></i><br>Настройки</div>
            </div>
          </div>

          <div class="main-chat" id="chat-window">
            <div class="chat-head">
              <i class="fas fa-arrow-left" onclick="closeChat()"></i>
              <div class="avatar" id="t-avatar" style="width:35px; height:35px; font-size:0.8em">?</div>
              <div style="margin-left:10px"><b id="t-name"></b><br><span id="typing-status">печатает...</span></div>
            </div>
            <div id="messages"></div>
            <form class="input-area" id="msg-form">
              <input id="m-input" placeholder="Сообщение..." autocomplete="off" oninput="sendTyping()">
              <button type="submit" style="background:none; border:none; color:var(--accent); font-size:1.4em;"><i class="fas fa-paper-plane"></i></button>
            </form>
          </div>
        </div>

        <script src="/socket.io/socket.io.js"></script>
        <script>
          const socket = io();
          let myName = "", activeChat = "", typingTimeout;
          let history = JSON.parse(localStorage.getItem('chat_history') || '{}');

          function auth() {
            const name = document.getElementById('reg-name').value.trim();
            const country = document.getElementById('reg-country').value.trim();
            if(!name.startsWith('@')) return alert('Ник с @!');
            socket.emit('auth', { name, country }, (res) => {
              if(res.status === 'ok') { localStorage.setItem('sto_user', JSON.stringify({name, country})); location.reload(); }
            });
          }

          function toggleDrawer(o) { document.getElementById('drawer').classList.toggle('open', o); document.getElementById('overlay').style.display = o ? 'block' : 'none'; }
          function doSearch() { const q = document.getElementById('search').value.trim(); if(q.length > 1) socket.emit('search', q); }

          socket.on('search_res', users => {
            const list = document.getElementById('chat-list-ui');
            list.innerHTML = '<div style="padding:10px; font-size:0.7em; color:gray">ПОИСК</div>';
            users.filter(u => u !== myName).forEach(u => addChatUI(u, true));
          });

          function addChatUI(user, isSearch = false) {
            if (document.querySelector(\`[data-user="\${user}"]\`) && !isSearch) return;
            const div = document.createElement('div');
            div.className = 'chat-item';
            div.dataset.user = user;
            div.innerHTML = \`<div class="avatar">\${user[1].toUpperCase()}</div>
                             <div class="online-dot" id="dot-\${user}"></div>
                             <div style="flex:1; margin-left:10px"><b>\${user}</b><br><small id="l-\${user}" style="color:gray">Открыть чат</small></div>\`;
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
          }

          function closeChat() { document.getElementById('chat-window').classList.remove('active'); document.getElementById('sidebar').classList.remove('mobile-hide'); activeChat = ""; }

          function sendTyping() {
            socket.emit('typing', { to: activeChat, from: myName });
          }

          socket.on('is_typing', data => {
            if(activeChat === data.from) {
              const status = document.getElementById('typing-status');
              status.style.display = 'block';
              clearTimeout(typingTimeout);
              typingTimeout = setTimeout(() => status.style.display = 'none', 2000);
            }
          });

          document.getElementById('msg-form').onsubmit = (e) => {
            e.preventDefault();
            const text = document.getElementById('m-input').value.trim();
            if(text && activeChat) {
              const time = new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
              const id = Date.now();
              const msg = { id, to: activeChat, text, time, type: 'sent' };
              socket.emit('private_msg', msg);
              saveMsg(activeChat, msg);
              addMsgUI(text, 'sent', time, id);
              document.getElementById('m-input').value = '';
            }
          };

          socket.on('push_msg', (data) => {
            addChatUI(data.from);
            const msg = { id: data.id, from: data.from, text: data.text, time: data.time, type: 'received' };
            saveMsg(data.from, msg);
            if(activeChat === data.from) addMsgUI(data.text, 'received', data.time, data.id);
          });

          socket.on('msg_deleted', id => {
            const el = document.querySelector(\`[data-id="\${id}"]\`);
            if(el) el.remove();
            // Удаляем из локальной истории
            for(let chat in history) {
              history[chat] = history[chat].filter(m => m.id !== id);
            }
            localStorage.setItem('chat_history', JSON.stringify(history));
          });

          function deleteMsg(id) {
            if(confirm('Удалить сообщение для всех?')) {
              socket.emit('delete_msg', { to: activeChat, id });
              const el = document.querySelector(\`[data-id="\${id}"]\`);
              if(el) el.remove();
              history[activeChat] = history[activeChat].filter(m => m.id !== id);
              localStorage.setItem('chat_history', JSON.stringify(history));
            }
          }

          function saveMsg(chat, msg) {
            if(!history[chat]) history[chat] = [];
            history[chat].push(msg);
            localStorage.setItem('chat_history', JSON.stringify(history));
          }

          function renderMessages() {
            const box = document.getElementById('messages');
            box.innerHTML = '';
            if(history[activeChat]) history[activeChat].forEach(m => addMsgUI(m.text, m.type, m.time, m.id));
          }

          function addMsgUI(text, type, time, id) {
            const div = document.createElement('div');
            div.className = 'bubble ' + type;
            div.dataset.id = id;
            div.innerHTML = \`\${text}<span class="time">\${time}</span>\`;
            if(type === 'sent') div.onclick = () => deleteMsg(id);
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
                  document.getElementById('p-sub').innerText = p.country;
                  document.getElementById('p-avatar').innerText = p.name[1].toUpperCase();
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
    s.broadcast.emit('user_online', d.name); 
  });
  s.on('search', q => {
    s.emit('search_res', Array.from(users.keys()).filter(n => n.includes(q)));
  });
  s.on('typing', d => {
    const t = users.get(d.to);
    if(t) io.to(t).emit('is_typing', { from: s.username });
  });
  s.on('private_msg', d => {
    const t = users.get(d.to);
    if(t) io.to(t).emit('push_msg', { id: d.id, from: s.username, text: d.text, time: d.time });
  });
  s.on('delete_msg', d => {
    const t = users.get(d.to);
    if(t) io.to(t).emit('msg_deleted', d.id);
  });
  s.on('disconnect', () => { if(s.username) users.delete(s.username); });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => console.log('StoGram v2.0 Ready'));
