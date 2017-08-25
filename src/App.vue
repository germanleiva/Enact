<template>
  <div id="app">
    <div id="upperArea">
        <div id="StateTimelineArea">
            <toolbar></toolbar>
            <output-area class="visual-state" ref="outputArea"></output-area>
            <input-area></input-area>
        </div>
        <div id="mirrorContainer">
            <visual-state-canvas :visual-state-model="deviceVisualState" class="mirror" style="position:relative" draggable="true" :is-mirror="true">
            </visual-state-canvas>
        </div>
    </div>
    <code-area></code-area>
  </div>
</template>

<script>
import Vue from 'vue'
import {extendArray} from './collections.js'
extendArray(Array);

import VueD3 from 'vue-d3'
Vue.use(VueD3)

import {globalStore, globalBus, VisualStateModel, InputEvent} from './store.js'
import Toolbar from './components/Toolbar.vue'
import OutputArea from './components/OutputArea.vue'
import InputArea from './components/InputArea.vue'
import VisualStateCanvas from './components/VisualStateCanvas.vue'
import CodeArea from './components/CodeArea.vue'

export default {
  name: 'app',
  data () {
    return {
        canvasWidth: globalStore.mobileWidth,
        canvasHeight: globalStore.mobileHeight,
    }
  },
  components: {
    Toolbar,
    OutputArea,
    InputArea,
    CodeArea,
    VisualStateCanvas
  },
  beforeCreate: function() {
    globalStore.socket.emit('message-from-desktop', { type: "CLEAN", message: {} })
  },
  mounted: function() {
    globalBus.$on('message-from-device-MOBILE_INIT', function(data) {
        // console.log("TYPE OF EVENT " + data.message.type + " data: " + JSON.stringify(data))
    }.bind(this));

    globalBus.$on('message-from-device-CURRENT_EVENT', function(data) {
        // console.log("TYPE OF EVENT " + data.message.type + " data: " + JSON.stringify(data))
        this.deviceVisualState.currentInputEvent = new InputEvent(data.message)
    }.bind(this));

    globalBus.$on('didRecordingChanged',function(isRecording) {
        console.log("didRecordingChanged " + isRecording)
        this.deviceVisualState.showAllInputEvents = isRecording
    }.bind(this));

    globalBus.$on('message-from-device-SHAPE_CREATED',function(data) {
        //If the deviceVisualState has the shape then we edit else we create
        // console.log("SHAPE_CREATED json: " + JSON.stringify(data.shapeJSON))
        let deviceEditedShapeId = data.shapeJSON.id
        if (!this.deviceVisualState.shapesDictionary[deviceEditedShapeId]) {
            let myEditedShape = this.deviceVisualState.addNewShape(data.shapeType,deviceEditedShapeId)
            myEditedShape.fromJSON(data.shapeJSON)
        } else {
            console.log("We already have that SHAPE? WEIRD")
        }
    }.bind(this));

    globalBus.$on('message-from-device-SHAPE_CHANGED',function(data) {
        //If the deviceVisualState has the shape then we edit else we create
        // console.log("SHAPE_CHANGED json: " + JSON.stringify(data.shapeJSON))
        let deviceEditedShapeId = data.shapeJSON.id

        if (this.deviceVisualState.shapesDictionary[deviceEditedShapeId]) {
            let myEditedShape = this.deviceVisualState.shapesDictionary[deviceEditedShapeId]

            myEditedShape.fromJSON(data.shapeJSON)
        } else {
            console.log("We are editing a shape that we don't have. WEIRD")
        }
    }.bind(this))

    globalBus.$on('message-from-device-SHAPE_DELETED',function(data) {
        //If the deviceVisualState has the shape then we edit else we create
        // console.log("SHAPE_DELETED json: " + JSON.stringify(data))
        let deviceEditedShapeId = data.id

        if (this.deviceVisualState.shapesDictionary[deviceEditedShapeId]) {
            Vue.delete(this.deviceVisualState.shapesDictionary, deviceEditedShapeId)
        } else {
            console.log("We are deleting a shape that we don't have. WEIRD")
        }
    }.bind(this))

    // this.prepareCanvas()
    var that = this;
    window.addEventListener('keydown', function(e) {
        // e.preventDefault()
        if (e.target.tagName == "INPUT" || globalStore.codeEditor.hasFocus()) {
            //ignore
            return
        }

        let arrowDisplacement = 1;
        console.log("keydown keyCode: " + e.keyCode)

        switch(e.keyCode) {
            case 16:{
                //ShiftLeft & ShiftRight
                e.preventDefault()
                globalStore.toolbarState.multiSelectionMode = true;
                if (globalStore.currentLink) {
                    globalStore.currentLink.shifted = true
                }
                break;
            }
            case 17:{
                //Ctrl
                e.preventDefault()
                break;
            }
            case 18:{
                //AltLeft & AltRight
                e.preventDefault()
                break;
            }
            case 38:{
                // up arrow
                e.preventDefault()
                that.$refs.outputArea.moveSelectedShapes(0,-arrowDisplacement)
                break;
            }
            case 40:{
                // down arrow
                e.preventDefault()
                that.$refs.outputArea.moveSelectedShapes(0,arrowDisplacement)
                break;
            }
            case 37:{
               // left arrow
                e.preventDefault()
                that.$refs.outputArea.moveSelectedShapes(-arrowDisplacement,0)
               break;
            }
            case 39:{
               // right arrow
                e.preventDefault()
                that.$refs.outputArea.moveSelectedShapes(arrowDisplacement,0)
               break;
            }
            case 46: {
                // MAC delete key
                e.preventDefault()
                if (!that.$refs.outputArea) {
                    debugger;
                }
                that.$refs.outputArea.deleteSelectedShapes()
                break;
            }
            case 91: {
                // MAC Cmd Key
                e.preventDefault()
                globalStore.isMetaPressed = true;
                break;
            }
        }
    });
    window.addEventListener('keyup', function(e) {
        switch(e.keyCode) {
            case 16: {
                //ShiftLeft & ShiftRight
                e.preventDefault()
                globalStore.toolbarState.multiSelectionMode = false;
                if (globalStore.currentLink) {
                    globalStore.currentLink.shifted = false
                }
                break;
            }
            case 17:{
                //Ctrl
                e.preventDefault()
                break;
            }
            case 18:{
                //AltLeft & AltRight
                e.preventDefault()
                break;
            }
            case 91: {
                // MAC Cmd Key
                e.preventDefault()
                globalStore.isMetaPressed = false;
            }
        }
    });
    window.addEventListener('onContextMenu', function(e) {
        e.preventDefault();
    })

  },
  computed: {
    deviceVisualState: function() {
        if (!globalStore.deviceVisualState) {
            globalStore.deviceVisualState = new VisualStateModel()
        }
        return globalStore.deviceVisualState
    }
  },
  methods: {
    mirrorDragged(event) {
        event.dataTransfer.setData("text/visual-state", "");
        console.log("Started dragging mirror mobile");
    },
    // prepareCanvas() {
    //     globalStore.context = document.getElementById('myCanvas').getContext("2d");

    //     globalStore.context.fillStyle = "#9ea7b8";
    //     globalStore.context.fillRect(0, 0, globalStore.context.canvas.width, globalStore.context.canvas.height);
    //     // globalStore.context.strokeStyle = "#df4b26";
    //     // globalStore.context.lineJoin = "round";
    //     // globalStore.context.lineWidth = 5;

    //     // globalStore.context.moveTo(0, 0);
    //     // globalStore.context.lineTo(200, 100);
    //     // globalStore.context.stroke();
    // },
    downArrowPressed(e){
        console.log("ARE YOU HERE???")
        this.$refs.outputArea.moveSelectedShapes(0,-arrowDisplacement)
    },
    keydownPressed(e) {
        let arrowDisplacement = 5;
        console.log("KEY DOWN EVENT " + typeof(e.keyCode))
        switch(e.keyCode) {
            case 16: //'Shift':
                globalStore.toolbarState.multiSelectionMode = true;
            case 18: //'AltLeft' & 'AltRight':
                break;
            case 38:
                // up arrow
                this.$refs.outputArea.moveSelectedShapes(0,arrowDisplacement)
                break;
            case 40:
                // down arrow
                console.log("DOWN ARROW")
                this.$refs.outputArea.moveSelectedShapes(0,-arrowDisplacement)
                break;
            case 37:
               // left arrow
                this.$refs.outputArea.moveSelectedShapes(-arrowDisplacement,0)
               break;
            case 39:
               // right arrow
                this.$refs.outputArea.moveSelectedShapes(arrowDisplacement,0)
               break;
        }
    },
    keyupPressed(e) {
        globalStore.toolbarState.multiSelectionMode = false;
    }
  }
}

</script>

<style>
@font-face {
  font-family: 'icomoon';
  src:  url('fonts/icomoon.eot?9codkd');
  src:  url('fonts/icomoon.eot?9codkd#iefix') format('embedded-opentype'),
    url('fonts/icomoon.ttf?9codkd') format('truetype'),
    url('fonts/icomoon.woff?9codkd') format('woff'),
    url('fonts/icomoon.svg?9codkd#icomoon') format('svg');
  font-weight: normal;
  font-style: normal;
}

[class^="icon-"], [class*=" icon-"] {
  /* use !important to prevent issues with browser extensions that change fonts */
  font-family: 'icomoon' !important;
  speak: none;
  font-style: normal;
  font-weight: normal;
  font-variant: normal;
  text-transform: none;
  line-height: 1;

  /* Better Font Rendering =========== */
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

.icon-ruler:before {
  content: "\e900";
}

.visualStateCanvas {
    min-width: 375px;
    background-color:white;
    border: 1px solid #333333;
    float:left;
    margin: 6px;
    position: relative;
}
#mirrorContainer{
    background-image: url("new_phone2.png");
    background-repeat: no-repeat;
    background-size: 100% 100%;
    background-color: white;
    margin: 1%;
}

.mirror{
    margin-top: 50px;
    flex-shrink: 0;
}

.mirror:hover{
    border-color: #aaaaaa;
    cursor: move;
}

.visualStateContainer {
    display: flex; /*This will make the diff container change the width (maybe this is not desired)*/
}

.diffContainer{
    margin-top: 5px;
    width: 30px;
    display: flex; /*This is to align the diff button and the diff box*/
    flex-direction: row; /*To have the child vertically align*/
}

.visualStateDiff { /*MAybe we need to rename this as diffButton or shomething*/
     margin-top: 35px;
}

.diffBox {
    margin-top: 3px;
    /*I need to remove white space
    to keep the text inside*/
    white-space: normal;
}

.outputArea {
    background-color: #eeeeee;
    display: flex; /*This doesn't work with block*/
    width: 100%;
    /*I need to put the white space
    in order to get the scrolling to work*/
    overflow-x : scroll;
    white-space: nowrap;
    padding-left: 1%;
    border-right: 3px solid #eeeeee;
}

#toolbar{
  display: block;
  padding-left: 1%;
  padding-right: 1%;
  padding-top: 0.7%;
  padding-bottom: 0.7%;

}

.is-active{
    background-color: #fafafa;
}

#title{
  font-family: futura;
  font-weight: 800;
}

.is-alone{
    margin-right: 10px;
    margin-left: 10px;
}

#color-picker{

}

.fa-rotate-45 {
    -webkit-transform: rotate(45deg);
    -moz-transform: rotate(45deg);
    -ms-transform: rotate(45deg);
    -o-transform: rotate(45deg);
    transform: rotate(45deg);
}

.fa-rotate-135 {
    -webkit-transform: rotate(135deg);
    -moz-transform: rotate(135deg);
    -ms-transform: rotate(135deg);
    -o-transform: rotate(135deg);
    transform: rotate(135deg);
}

.inputTimeline {
    width: 100%;
    height: 40px;
    background-color: #CCC;
    position:relative;
    margin: 0px 5px; //0px top bottom and 5px left right
    border-radius: 3px;
}

.mark {
    width: 40px;
    height: 40px;
    position: absolute;
    text-align: center;
}

#inputArea {
    display: flex;
    justify-content:center;
    padding-left: 1%;
    padding-top: 0.8%;
    padding-bottom: 0.8%;

    background-color: #ffffff;
}

#upperArea{
    display: flex;
    justify-content: flex-end;
}

#StateTimelineArea{
    display: flex;
    flex-direction: column;
    flex-grow: 1;
    overflow-x : scroll;
    background-color: white;
}
</style>
