// import io from 'socket.io';
var io = require("socket.io-client");
require("jquery-ui/ui/widgets/draggable");
require("jquery-ui/ui/widgets/resizable");
require('jquery-ui-touch-punch');
var fabric = require('fabric').fabric;
var jsPDF = require('jspdf');

let socket = io();
window.socket = socket;
let nowText = $('#title').text;
let showStatus = $('#displaySwitch').is(':checked');
let list = '';
let editPosition = false;
let canvas = new fabric.Canvas('Seating', {
    imageSmoothingEnabled: false
});
let editmode = false
let angle = 0

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

socket.on('new editmode', function (json) {
    editmode = json.editmode
    if (editmode) {
        $('.editspace').css("display", "inline");
        $('.clearposition').css("display", "none");
    } else {
        $('.editspace').css("display", "none");
        $('.clearposition').css("display", "inline");
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
    let windowWidth = $('.row').width()
    let windowHeight = $(window).height() - 200;
/*     canvas.setHeight(windowHeight); */
/*     canvas.setWidth(windowWidth); */
    canvas.renderAll();
    var departStatus = $("#DepartdisplaySwitch").is(':checked');
    var nameStatus = $("#NamedisplaySwitch").is(':checked');
    var titleStatus = $("#JobdisplaySwitch").is(':checked');


    await $.getJSON("api/site", function (json) {
        site = JSON.parse(json)
    });

    await $.getJSON("api/position", function (json) {
        sPositions = json || "{}", positions = JSON.parse(sPositions);
    });

    //將匯入名單轉成按鈕，供直接點選
    await $.getJSON('api/list', function (json) {
        list = JSON.parse(json).list;
        $('.draggable').draggable('disable');
    });
    canvas.off('object:scaling')
    canvas.off('object:scaled')
    canvas.off('object:moved')
    canvas.clear();

    if (editmode) {
        canvas.loadFromJSON(site, canvas.renderAll.bind(canvas))
    } else {
        canvas.loadFromJSON(site, canvas.renderAll.bind(canvas), function (o, object) {
            object.selectable = false
            canvas.sendBackwards(object)
            canvas.renderAll.bind(canvas)
        });
    }

    for (var i = 0; i < list.length; i++) {
        let count = 0
        list[i].map((element, index) => {
            let depart = element.split('/')[0];
            let name = element.split('/')[1];
            let title = element.split('/')[2];
            var buttonText = '';
            /*             if (departStatus && depart != null && depart != '') {
                            buttonText += depart;
                        }
                        if (nameStatus && name != null && name != '') {
                            buttonText += ' ' + name;
                        }
                        if (titleStatus && title != null && title != '') {
                            buttonText += '/' + title;
                        }  */
            buttonText += ' ' + name;
            let rect = new fabric.Rect({
                originX: 'center',
                originY: 'center',
                fill: '',
                width: 10,
                height: 75,
                /*                 stroke : 'black',
                                strokeWidth : 1 */
            });
            let departText = new fabric.Text(depart, {
                fontSize: 12,
                fontFamily: "Roboto, 'Noto Sans TC'",
                originX: 'center',
                originY: 1.5,
            });
            let nameText = new fabric.Text(buttonText, {
                fontSize: 18,
                fontFamily: "Roboto, 'Noto Sans TC'",
                originX: 'center',
                originY: -0.05
            });
            let groupid = 'drag_' + i + 1 + '-' + index + 1;
            let left = 50 + count * 130;
            let top = 50 + i * 70;

            if (positions[groupid]) {
                left = positions[groupid].left;
                top = positions[groupid].top;
            }
            let group = new fabric.Group([rect, departText, nameText], {
                id: groupid,
                left: left,
                top: top,
                originX: 'center',
                originY: 'center',
            });
            group.on('mousedown', function (e) {
                sendNewTitle(depart + ' ' + name + '//' + title);
            });

            group.on('moved', function (e) {
                positions[group.id] = { 'top': group.top, 'left': group.left };
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
                if (movingObject._objects[i].id !== undefined) {
                positions[movingObject._objects[i].id] = { 'top': y + movingObject._objects[i].top, 'left': x + movingObject._objects[i].left };
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
        }
    };

    canvas.on('object:moved', moveHandler);
    canvas.on({
        'object:scaling': function (e) {
            if (e.target._objects.length === 2) {
                var obj = e.target,
                w = obj.width * obj.scaleX,
                h = obj.height * obj.scaleY,
                s = obj.strokeWidth;
                obj._objects[0].set({
                    'height': obj.height,
                    'width': obj.width,
                    'scaleX': 1,
                    'scaleY': 1,
                    h: h,
                    w: w
                });
            }
        }
    });
    canvas.on({
        'object:scaled': function (e) {
            if (e.target._objects.length === 2) {
                group = e.target

                rect = e.target._objects[0]
                text = group._objects[1]
                rect.set({ height: rect.h, width: rect.w })
                canvas.remove(group)
                canvas.add(new fabric.Group([rect, text], {
                    top: group.top,
                    left: group.left
                }))
            }
        }

    });
    

    if (editmode) {
        canvas._objects.map(o => {
            if (o._objects.length !== 2) {
                o.selectable = false
            }
        })
    }

}
window.drawSeating = drawSeating;

//設定各位置 不含指標位置
function setPosition() {
    $.each(positions, function (id, pos) {
        canvas._objects.map(g => {
            if (g.id == id) {
                g.left = pos.left;
                g.top = pos.top;
            }
        })
    })
}

function Rotate() {
    angle += 90
    canvas._objects.map(o => {
        if (o._objects.length !== 2) {
            o.set('angle', angle)
        }
    })
    canvas.renderAll()
}

window.Rotate = Rotate;

//修改場地佈置
function EditSpace() {
    editmode = true
    drawSeating()
    socket.emit('editmode', { editmode: editmode })
}

window.EditSpace = EditSpace

function ClearSpace() {
    canvas._objects.map(o => {
        if (o._objects.length == 2) {
            canvas.remove(o);
        }
    })
}

window.ClearSpace = ClearSpace

function SaveSpace() {
    let objectArray = []
    canvas._objects.map(o => {
        if (o._objects.length == 2) {
            objectArray.push(o)
        }
    })
    let objects = { 'objects': objectArray }
    $.ajax
        ({
            type: "post",
            dataType: 'json',
            async: true,
            url: '/api/upload/site',
            data: { json: JSON.stringify(objects) },
            success: function (res) {
                drawSeating()
                editmode = false
                socket.emit('editmode', { editmode: editmode })
            },
            failure: function () {
                console.log('err');
            }
        });
}

window.SaveSpace = SaveSpace

function AddRectTable() {
    let count = 1
    canvas._objects.map(o => {
        if (o._objects.length == 2) {
            if (o._objects[1].text.includes('桌子')) {
                count++
            }
        }
    })
    let rect = new fabric.Rect({
        originX: 'center',
        originY: 'center',
        fill: '',
        width: 100,
        height: 100,
        stroke: 'black',
        strokeWidth: 1
    });
    let text = new fabric.Text('桌子' + count, {
        fontSize: 24,
        /* fontFamily:  "Roboto, 'Noto Sans TC'" , */
        originX: 'center',
        originY: 'center'
    });
    let group = new fabric.Group([rect, text], {
        left: 100,
        top: 100,
    });
    /* group.on({
        'scaling': function (e) {
            console.log(e)

            var obj = e.target,
                w = obj.width * obj.scaleX,
                h = obj.height * obj.scaleY,
                s = obj.strokeWidth;
            obj._objects[0].set({
                'height': obj.height,
                'width': obj.width,
                'scaleX': 1,
                'scaleY': 1,
                h: h,
                w: w
            });

        }
    });
    group.on({
        'scaled': function (e) {
            group = e.target
            rect = e.target._objects[0]
            rect.set({ height: rect.h, width: rect.w })
            text = group._objects[1]
            canvas.remove(group)
            canvas.add(new fabric.Group([rect, text], {
                top: group.top,
                left: group.left
            }))
        }

    }); */
    canvas.add(group);
}

window.AddRectTable = AddRectTable

function AddCircleTable() {
    let count = 1
    canvas._objects.map(o => {
        if (o._objects.length == 2) {
            if (o._objects[1].text.includes('桌子')) {
                count++
            }
        }
    })
    let circle = new fabric.Circle({
        originX: 'center',
        originY: 'center',
        fill: '',
        radius: 50,
        stroke: 'black',
        strokeWidth: 1
    });
    let text = new fabric.Text('桌子' + count, {
        fontSize: 20,
        originX: 'center',
        originY: 'center'
    });
    let group = new fabric.Group([circle, text], {
        left: 100,
        top: 100,
    });
    canvas.add(group);
}

window.AddCircleTable = AddCircleTable

function AddDoor() {
    let rect = new fabric.Rect({
        originX: 'center',
        originY: 'center',
        fill: '',
        width: 75,
        height: 75,
        stroke: 'black',
        strokeWidth: 1
    });
    let text = new fabric.Text('門', {
        fontSize: 16,
        originX: 'center',
        originY: 'center'
    });
    let group = new fabric.Group([rect, text], {
        left: 100,
        top: 100,
    });
    /* group.on({
        'scaling': function (e) {

            var obj = e.target,
                w = obj.width * obj.scaleX,
                h = obj.height * obj.scaleY,
                s = obj.strokeWidth;
            obj._objects[0].set({
                'height': obj.height,
                'width': obj.width,
                'scaleX': 1,
                'scaleY': 1,
                h: h,
                w: w
            });

        }
    });
    group.on({
        'scaled': function (e) {
            group = e.target
            rect = e.target._objects[0]
            rect.set({ height: rect.h, width: rect.w })
            text = group._objects[1]
            canvas.remove(group)
            canvas.add(new fabric.Group([rect, text], {
                top: group.top,
                left: group.left
            }))
        }

    }); */
    canvas.add(group);
}

window.AddDoor = AddDoor

function AddScreen() {
    let rect = new fabric.Rect({
        originX: 'center',
        originY: 'center',
        fill: '',
        width: 200,
        height: 100,
        stroke: 'black',
        strokeWidth: 1
    });
    let text = new fabric.Text('投影幕', {
        fontSize: 24,
        originX: 'center',
        originY: 'center'
    });
    let group = new fabric.Group([rect, text], {
        left: 100,
        top: 100,
    });
    /* group.on({
        'scaling': function (e) {

            var obj = e.target,
                w = obj.width * obj.scaleX,
                h = obj.height * obj.scaleY,
                s = obj.strokeWidth;
            obj._objects[0].set({
                'height': obj.height,
                'width': obj.width,
                'scaleX': 1,
                'scaleY': 1,
                h: h,
                w: w
            });

        }
    });
    group.on({
        'scaled': function (e) {
            group = e.target
            rect = e.target._objects[0]
            rect.set({ height: rect.h, width: rect.w })
            text = group._objects[1]
            canvas.remove(group)
            canvas.add(new fabric.Group([rect, text], {
                top: group.top,
                left: group.left
            }))
        }

    }); */
    canvas.add(group);
}

window.AddScreen = AddScreen

function AddWorkingtable() {
    let rect = new fabric.Rect({
        originX: 'center',
        originY: 'center',
        fill: '',
        width: 200,
        height: 100,
        stroke: 'black',
        strokeWidth: 1
    });
    let text = new fabric.Text('工作桌', {
        fontSize: 24,
        originX: 'center',
        originY: 'center'
    });
    let group = new fabric.Group([rect, text], {
        left: 100,
        top: 100,
    });
    /* group.on({
        'scaling': function (e) {
            var obj = e.target,
                w = obj.width * obj.scaleX,
                h = obj.height * obj.scaleY,
                s = obj.strokeWidth;
            obj._objects[0].set({
                'height': obj.height,
                'width': obj.width,
                'scaleX': 1,
                'scaleY': 1,
                h: h,
                w: w
            });

        }
    });
    group.on({
        'scaled': function (e) {
            group = e.target
            rect = e.target._objects[0]
            rect.set({ height: rect.h, width: rect.w })
            text = group._objects[1]
            canvas.remove(group)
            canvas.add(new fabric.Group([rect, text], {
                top: group.top,
                left: group.left
            }))
        }

    }); */
    canvas.add(group);
}

window.AddWorkingtable = AddWorkingtable

function ExportJPG() {

}

window.ExportJPG = ExportJPG

function ExportPDF() {
    $.getJSON("api/title", function (json) {
        title = JSON.parse(json).title
        var pdf = new jsPDF('l', 'px', [canvas.width, canvas.height]);
/*         pdf.text('Hello world!', 10, 10) */
        let image = canvas.toDataURL("image/png");
        width = pdf.internal.pageSize.getWidth();
        height = pdf.internal.pageSize.getHeight();
        pdf.addImage(image, 'JPEG', 0, 0, width, height);
        pdf.save('座位圖.pdf');
    });
}

window.ExportPDF = ExportPDF

$(document).keydown(function (event) {
    if (event.which == 46) {
        canvas.remove(canvas.getActiveObject());
        canvas.renderAll.bind(canvas)
    }

});

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
