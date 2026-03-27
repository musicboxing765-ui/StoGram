const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

let occupiedNames = new Map(); 

app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="ru">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
        <title>StoGram Premium</title>
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css">
        <style>
          :root { --bg: #0e1621; --side: #17212b; --text: #ffffff; --accent: #5288c1; --drawer-bg: #1c242d; --input-bg: #242f3d; --msg-out: #2b5278; --msg-in: #182533; }
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: -apple-system, system-ui, sans-serif; background: var(--bg); color: var(--text); height: 100vh; overflow: hidden; }

          /* ЭКРАН ВХОДА */
          #reg-screen { position: fixed; inset: 0; background: var(--bg); z-index: 9999; display: flex; align-items: center; justify-content: center; padding: 20px; }
          .reg-card { background: var(--side); padding: 30px; border-radius: 15px; width: 100%; max-width: 380px; text-align: center; border: 1px solid #222; }
          .reg-card input { width: 100%; padding: 14px; margin-bottom: 12px; border-radius: 10px; border: none; background: var(--input-bg); color: white; outline: none; }
          .reg-btn { width: 100%; padding: 14px; border-radius: 10px; border: none; background: var(--accent); color: white; font-weight: bold; cursor: pointer; }

          /* ГЛАВНЫЙ ИНТЕРФЕЙС */
          #app-interface { display: none; width: 100%; height: 100vh; flex-direction: row; }
          .sidebar { width: 100%; max-width: 380px; border-right: 1px solid #000; display: flex; flex-direction: column; background: var(--side); }
          .top-nav { padding: 10px 15px; display: flex; align-items: center; gap: 15px; }
          .search-bar { flex: 1; background: var(--input-bg); border-radius: 20px; padding: 8px 15px; display: flex; align-items: center; }
          .search-bar input { background: transparent; border: none; color: white; outline: none; width: 100%; margin-left: 10px; }

          .chat-list { flex: 1; overflow-y: auto; }
          .chat-item { padding: 12px 15px; display: flex; align-items: center; gap: 12px; cursor: pointer; transition: 0.2s; }
          .chat-item:hover { background: rgba(255,255,255,0.05); }

          /* ОКНО ЧАТА */
          .main-chat { flex: 1; display: none; flex-direction: column; background: var(--bg); position: relative; }
          .main-chat.active { display: flex; }
          .chat-head { padding: 10px 20px; background: var(--side); border-bottom: 1px solid #000; display: flex; align-items: center; gap: 15px; z-index: 5; }
          
          #messages { 
            flex: 1; padding: 15px; overflow-y: auto; 
            background: url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png'); 
            background-size: cover; background-attachment: fixed;
            display: flex; flex-direction: column; gap: 4px; 
          }
          
          /* ПУЗЫРИ СООБЩЕНИЙ */
          .bubble-wrap { display: flex; flex-direction: column; width: 100%; }
          .bubble { 
            padding: 6px 12px; border-radius: 12px; max-width: 75%; font-size: 0.95em; 
            position: relative; display: inline-block; word-wrap: break-word;
          }
          .sent { background: var(--msg-out); align-self: flex-end; border-bottom-right-radius: 2px; color: white; }
          .received { background: var(--msg-in); align-self: flex-start; border-bottom-left-radius: 2px; color: white; }
          
          .msg-meta { font-size: 0.7em; margin-left: 8px; float: right; margin-top: 4px; color: rgba(255,255,255,0.5); display: flex; align-items: center; gap: 3px; }
          .fa-check-double { color: #4fc3f7; }

          .input-area { padding: 10px 15px; background: var(--side); display: flex; align-items: center; gap: 15px; }
          .input-area input { flex: 1; background: transparent; border: none; color: white; outline: none; font-size: 1rem; }

          /* ШТОРКА (МЕНЮ) */
          .drawer-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.7); z-index: 1000; display: none; }
          .drawer { position: fixed; top: 0; left: -280px; width: 280px; height: 100%; background: var(--drawer-bg); z-index: 1001; transition: 0.3s; }
          .drawer.open { left: 0; }
          .drawer-header { padding: 20px; background: linear-gradient(135deg, #2b5278 0%, #17212b 100%); height: 140px; display: flex; flex-direction: column; justify-content: flex-end; }
          .avatar-circle { width: 50px; height: 50px; border-radius: 50%; background: var(--accent); border: 2px solid #fff; display: flex; align-items: center; justify-content: center; font-weight: bold; margin-bottom: 8px; }

          @media (max-width: 768px) { 
            .sidebar.mobile-hide { display: none; }
            .main-chat.active { display: flex; position: absolute; width: 100%; height: 100%; z-index: 50; }
          }
        </style>
      </head>
      <body>

        <div id="reg-screen">
          <div class="reg-card">
            <h2 style="margin-bottom:20px">StoGram</h2>
            <input type="text" id="reg-name" placeholder="@username">
            <input type="text" id="reg-country" placeholder="Страна">
            <button class="reg-btn" onclick="auth()">Войти</button>
          </div>
        </div>

        <div id="app-interface">
          <div class="drawer-overlay" id="overlay" onclick="toggleDrawer(false)"></div>
          <div class="drawer" id="drawer">
            <div class="drawer-header">
              <div class="avatar-circle" id="p-avatar">?</div>
              <div id="p-name" style="font-weight:bold;"></div>
              <div id="p-sub" style="font-size:0.85em; color:rgba(255,255,255,0.7);"></div>
            </div>
            <div style="padding:10px 0;">
              <div style="padding:15px 20px; cursor:pointer" onclick="document.getElementById('bg-input').click()">
                <i class="fas fa-image"></i> &nbsp; Изменить фон
              </div>
              <input type="file" id="bg-input" hidden accept="image/*" onchange="setWallpaper(this)">
              <div style="padding:15px 20px; cursor:pointer" onclick="logout()">
                <i class="fas fa-sign-out-alt"></i> &nbsp; Выход
              </div>
            </div>
          </div>

          <div class="sidebar" id="sidebar">
            <div class="top-nav">
              <i class="fas fa-bars" onclick="toggleDrawer(true)" style="cursor:pointer"></i>
              <div class="search-bar">
                <input type="text" id="search" placeholder="Поиск..." oninput="doSearch()">
              </div>
            </div>
            <div class="chat-list" id="chat-list-ui"></div>
          </div>

          <div class="main-chat" id="chat-window">
            <div class="chat-head">
              <i class="fas fa-arrow-left" onclick="closeChat()" style="cursor:pointer"></i>
              <div class="avatar-circle" style="width:38px; height:38px; margin:0; font-size:0.9em;" id="t-avatar">?</div>
              <div id="t-name" style="font-weight:bold; margin-left:10px">Чат</div>
            </div>
            <div id="messages"></div>