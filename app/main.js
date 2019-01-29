// import io from 'socket.io';
var io = require("socket.io-client");
require("jquery-ui/ui/widgets/draggable");
require("jquery-ui/ui/widgets/resizable");
require('jquery-ui-touch-punch');

let socket = io();
window.socket = socket;
let nowText = $('#title').text;
let showStatus = $('#displaySwitch').is(':checked');
let list = '';
let editPosition = false;
let canvas = new fabric.Canvas('Seating');

var sPositions = '';
var positions = '';

changeShowStatus();

drawSeating();

// 接收訊息並顯示在前端畫面上
socket.on('new title', function (json) {
    if (nowText != json.title) {
        var depart = json.title.split('/')[0];
        var name = json.title.split('/')[1];
        var title = json.title.split('/')[2];
        var buttonText = '';

        if (depart != null && depart != '') {
            buttonText += depart;
        }
        if (name != null && name != '') {
            buttonText += ' ' + name;
        }
        if (title != null && title != '') {
            buttonText += '/' + title;
        }
        buttonText = $.trim(buttonText);
        if (!showStatus) {
            nowText = buttonText;
            $('#title').text(nowText);

            return;
        }
        $('#textbg').fadeOut('fast', function () {
            // Animation complete.
        });
        nowText = '';
        $('#title').animate({ opacity: 0 }, 200, function () {
            $('#title').text(buttonText).animate({ opacity: 1 }, 200);
        });
        nowText = buttonText;
        $('#textbg').fadeIn('fast', function () {
            // Animation complete.
        });
    }
});

socket.on('new status', function (json) {
    // 接收顯示狀態是否改變
    showStatus = json.status;
    $('#displaySwitch').attr('checked', showStatus);
    if (!showStatus) {
        $('#textbg').fadeOut('slow', function () {
            // Animation complete.
        });
    } else {
        $('#textbg').fadeIn('slow', function () {
            // Animation complete.
        });
    }
});

// 送出訊息(訊息,顯示狀態)
function sendNewTitle(text) {
    socket.emit('title', { title: text });
}

// 更改顯示狀態
function changeShowStatus() {
    if (nowText == '') {
        $('#displaySwitch').attr('checked', false);
        return;
    }
    socket.emit('status', {
        status: $('#displaySwitch').is(':checked')
    });
}
window.changeShowStatus = changeShowStatus;

// 輸入新訊息
function newTitle() {
    var data = $('#inputField').val();
    if (data == '') {
        return
    }
    sendNewTitle(data);
    $('#inputField').val('');
}

// 點選匯入的名單
function clickTitle(title_text, btn_Id) {
    if (title_text != '') {
        $('#inputField').val(title_text);
        newTitle();
    }
    $('.listbutton').css('background-color', '#fff');
    $('.listbutton').css('color', '#000');
    $('#' + btn_Id).css('background-color', '#000');
    $('#' + btn_Id).css('color', '#fff');
};
window.clickTitle = clickTitle;

//畫出List 改用fabric
async function drawSeating() {
    var departStatus = $("#DepartdisplaySwitch").is(':checked');
    var nameStatus = $("#NamedisplaySwitch").is(':checked');
    var titleStatus = $("#JobdisplaySwitch").is(':checked');

    await $.getJSON("api/position",  function (json) {
        sPositions = json || "{}", positions = JSON.parse(sPositions);    
    });

    //將匯入名單轉成按鈕，供直接點選
    await $.getJSON('api/list', function (json) {
        list = JSON.parse(json).list;
        $('.draggable').draggable('disable');
    });

    canvas.clear();
    
    for (var i = 0; i < list.length; i++) {
        let count = 0
        list[i].map( (element, index) =>  {
            let depart = element.split('/')[0];
            let name = element.split('/')[1];
            let title = element.split('/')[2];
            var buttonText = '';
            if (departStatus && depart != null && depart != '') {
                buttonText += depart;
            }
            if (nameStatus && name != null && name != '') {
                buttonText += ' ' + name;
            }
            if (titleStatus && title != null && title != '') {
                buttonText += '/' + title;
            }            
            let rect = new fabric.Rect({
                originX: 'center',
                originY: 'center',
                fill: '',
                width: 80,
                height: 40,
                stroke : 'black',
                strokeWidth : 1
            });
            let text = new fabric.Text(buttonText, {
                fontSize: 16,
                originX: 'center',
                originY: 'center'
            });
            let groupid = 'drag_' + i + 1 + '-' + index + 1;
            let left = 50 + count * 90;
            let top =  50 + i * 50;

            if (positions[groupid]) {
                left = positions[groupid].left;
                top = positions[groupid].top;
            }
            let group = new fabric.Group([ rect, text ], {
                id: groupid,
                left: left,
                top: top,
            });

            group.on('mousedown', function(e) {
                sendNewTitle(depart + ' ' + name + '//' + title);
            });

            group.on('mousemove', function(e) {
                positions[group.id] = {'top': group.top, 'left': group.left};
                $.ajax
                ({
                    type: "post",
                    dataType: 'json',
                    async: true,
                    url: '/api/upload/position',
                    data: { json: JSON.stringify(positions) },
                    success: function () {
                        console.log('OK');
                    },
                    failure: function () {
                        console.log('err');
                    }
                });
            });

            canvas.add(group);
            count++;
        });
    }
    
    var moveHandler = function (evt) {
        var movingObject = evt.target;
        let x = movingObject.left + movingObject.width / 2;
        let y = movingObject.top + movingObject.height / 2;
        for (var i = 0; i < movingObject._objects.length; i++) { 
            positions[movingObject._objects[i].id] = {'top': y + movingObject._objects[i].top, 'left': x + movingObject._objects[i].left};
            $.ajax
            ({
                type: "post",
                dataType: 'json',
                async: true,
                url: '/api/upload/position',
                data: { json: JSON.stringify(positions) },
                success: function () {
                    console.log('OK');
                },
                failure: function () {
                    console.log('err');
                }
            });
        }
    };

    canvas.on('object:moving', moveHandler);
}
window.drawSeating = drawSeating;

//設定各位置 不含指標位置
function setPosition() {
    $.each(positions, function (id, pos) {
        canvas._objects.map( g => {
            if (g.id == id) {
                g.left = pos.left;
                g.top = pos.top;
            }
        })
    })
}

//hotkey
$(document).keypress(function (e) {
    if (e.which == 13) {
        // enter pressed
        newTitle();
    }
});
// ctrl+~ = dislpay click
$(document).keydown(function (e) {
    if (e.keyCode == 192 && e.ctrlKey) {
        $('#displaySwitch').click();
        changeShowStatus();
    }
});

module.exports = { drawSeating };
