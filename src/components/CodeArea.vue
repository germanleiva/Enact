<template>
    <div id="codeArea" class="columns">
        <div class="column">
            <div class="columns">
                <div class="column" style="height:200px;overflow: auto">
                    <a v-for="i in [0]" class="button" style="width:100%">Object {{i}}</a>
                </div>
                <div class="column" style="height:200px;overflow: auto">
                    <a v-for="i in [0]" class="button" style="width:100%">Function {{i}}</a>
                </div>
            </div>
            <div ref="codeContainer" style="background-color: yellow">
                <codemirror ref="codeMirror"
                  :code="content"
                  :options="editorOptions"
                  @ready="onEditorReady"
                  @focus="onEditorFocus"
                  @change="onEditorCodeChange">
                </codemirror>
            </div>
        </div>
        <!-- <div class="columnVariables" style="background-color:green"></div> -->
        <div class="column" style="background-color:blue;">
            <state-diagram :nodes="states" :links="edges" style="height:200px">
            </state-diagram>
            <div style="background-color:rgba(255,100,0,50)">
                <codemirror
                  :code="`function algo() { return console.log('pepe'); }`"
                  :options="editorOptions"
                  @ready="onEditorReady"
                  @focus="onEditorFocus"
                  @change="onEditorCodeChange">
                </codemirror>
            </div>
        </div>

    </div>
</template>

<script>
import Vue from 'vue'
import {extendArray} from '../collections.js'
extendArray(Array);
import {globalStore, globalBus, State, DiffModel} from '../store.js'
import { codemirror, CodeMirror } from 'vue-codemirror'
import StateDiagram from './StateDiagram.vue'
import TextMark from './TextMark.vue'

let ContextMenu = Vue.extend({
    template: `<div :style="styleObject">
    <p class="menu-label">
        Select property
      </p>
      <ul class="menu-list">
        <li v-for="eachProperty in properties"><a v-on:click="clickedOn(eachProperty)">{{eachProperty}}</a><li>
      </ul>
      </div>`,
      data: function() {
        return {
            startingX: 0,
            startingY: 0,
            onSelectedProperty: undefined,
            properties: ['position','size','color']
        }
      },
      computed: {
        styleObject: function() {
            return {
                left: this.startingX + 'px',
                top: this.startingY + 'px',
                position: 'absolute',
                'background-color': 'white',
                'z-index':999
            }
        }
      },
      methods: {
        clickedOn: function(propertyName) {
            this.onSelectedProperty(propertyName,['y'])
            this.$el.remove()
            this.$destroy()
        }
      }
});

const acceptedInputTypes = ["text/diff-touch","text/diff-measure","text/diff-shape"]
const acceptedOutputTypes = ["text/diff-shape"]

export default {
    name: 'code-area',
    data: function() {
        return {
            editorOptions: {
                // codemirror options
                tabSize: 4,
                mode: 'text/javascript',
                // theme: 'default',
                lineNumbers: true,
                line: true,
                // keyMap: "sublime",
                lineWrapping: true,
                extraKeys: { "Ctrl": "autocomplete" },
                foldGutter: true,
                gutters: ["CodeMirror-linenumbers", "CodeMirror-foldgutter"],
                styleSelectedText: true,
                highlightSelectionMatches: { showToken: /\w/, annotateScrollbar: true },
                // more codemirror config...
            },
            states: [
                { id: 'idle', name: 'Idle', x:0, y:0, isSelected: false},
                { id: 'moving', name: 'Moving', x:0, y:0, isSelected: false}
            ],
            edges: [
                { source: 'idle', target: 'moving', name: 'touchstart', isSelected: false},
                { source: 'moving', target: 'moving', name: 'touchmove', isSelected: false},
                { source: 'moving', target: 'idle', name: 'touchend', isSelected: false},
            ],
            content:
`var stateMachine = {
    shape1: function() {
        return mobileCanvasVM.shapeFor("S1");
    },

    touch1: function(event) {
        return event.touches[0];
    },

    recordDelta: function(event) {
        var info = event.info;
        info.delta = {
            x: info.cur.x - info.prev.x,
            y: info.cur.y - info.prev.y,
            t: info.cur.t - info.prev.t
        }
    },
    isInside: function(touch, shape) {
        return shape.left < touch.pageX && shape.top < touch.pageY && shape.left + shape.width > touch.pageX && shape.top + shape.height > touch.pageY;
    },

    actions: {
        moveShape1: function(event) {
            this.shape1().color = '#00ff00'
            this.recordDelta(event);
            this.shape1().left += this.touch1(event).info.delta.x;
            this.shape1().top += this.touch1(event).info.delta.y;
        },
        changeColorShape1: function(event) {
            this.shape1().color = '#ff0000';
        },
        aGuard: function(event) {
            return true;
        },
        isTouch1InsideShape1: function(event) {
            return this.isInside(this.touch1(event),this.shape1());
        }
    },

    states: {
        idle: {
            on_touchstart: 'isTouch1InsideShape1 ? -> moving'
        },

        moving: {
            on_touchmove: 'moveShape1 -> moving',
            on_touchend: 'changeColorShape1 -> idle',
        }
    }
}`
        }
    },
    components: {
        codemirror: codemirror,
        StateDiagram
    },
    methods: {
        setEditorCursorAt(editor,event) {
            let newCoordinates = editor.coordsChar({left:event.pageX,top:event.pageY})
            editor.focus()
            editor.doc.setCursor(newCoordinates)
            return newCoordinates
        },
        onEditorMouseUp(editor,event) {
            if (globalStore.currentLink) {
                let {object,visualState} = globalStore.currentLink

                let newCoordinates = this.setEditorCursorAt(editor,event)

                let newContextMenu = new ContextMenu()
                newContextMenu.startingX = event.pageX;
                newContextMenu.startingY = event.pageY;

                newContextMenu.onSelectedProperty = (propertyName,axis) => {
                    // for (let eachAxis of axis) {
                    //     value[eachAxis] = object[property].value[eachAxis]
                    // }
                    // this[ruleSectionToFill] = value

                    // aRuleSide[axisName].loadElement(maxOrMin,object,propertyName)
                    // newContextMenu.$el.remove()
                    // newContextMenu.$destroy()
                    console.log("SELECTED PROPERTY: " + propertyName)
                    // editor.focus()
                    // editor.doc.setCursor(newCoordinates)
                    editor.doc.replaceSelection(`{${propertyName}:${JSON.stringify(object[propertyName])}}`)

                    let from = newCoordinates
                    let to = editor.doc.getCursor("to")

                    var markSpan = document.createElement('span')
                    // markSpan.className = "locura";
                    // markSpan.innerHTML = "CHAN";
                    editor.doc.markText(from, to, {replacedWith: markSpan});

                    // create component constructor
                    const TextMarkConstructor = Vue.extend(TextMark);
                    var child = new TextMarkConstructor({
                        el: markSpan, // define the el of component
                        parent: this, // define parent of component
                        propsData: {
                            visualState: visualState,
                            object: object,
                            propertyName: propertyName
                        }
                    }).$mount();

                    // this.content = editor.getValue()
                    // debugger;
                }

                newContextMenu.$mount()
                window.document.body.appendChild(newContextMenu.$el)

                editor.focus()
            }
        },
        dragOverOnCode(editor,event) {
            if (this.draggedTypeFor(event.dataTransfer,acceptedInputTypes)) {
                this.setEditorCursorAt(editor,event)
                event.preventDefault(); //To accept the drop
            }
        },
        dropOnCode(editor,event) {
            event.preventDefault();
            var dataType = this.draggedTypeFor(event.dataTransfer,acceptedInputTypes)
            var data = event.dataTransfer.getData(dataType);
            if (!data) {
                console.log("WEIRD, we accepted the drop but there is no data for us =(")
                return
            }
            console.log("dropForOutput >> " + data)

            let diffModel = new DiffModel(JSON.parse(data))


            debugger;
        },
        draggedTypeFor(dataTransfer,acceptedTypes) {
            let receivedTypes = [...dataTransfer.types]
            for (let acceptedType of acceptedTypes) {
                for (let receivedType of receivedTypes) {
                    if (acceptedType == receivedType) {
                        return acceptedType
                    }
                }
            }
            return undefined
        },
        onEditorReady(editor) {
          console.log('the editor is ready!', editor)
          let from = {line:0,ch:0} //Inclusive
          let to = {line: 9, ch: 0} //Ch 0 means, that that line is not affected

          // <diff-element v-for="diff in diffArray" :diff-data="diff" :visual-state-model="visualStateModel"></diff-element>



          editor.on("mouseover", function(editor,e){
            if (globalStore.currentLink) {
                this.setEditorCursorAt(editor,event)
            }

          });

            // editor.on("dragstart",function(editor,e) {
            //     console.log('dragstart')
            // });
            // editor.on("dragenter",function(editor,e) {
            //     console.log('dragenter')
            // });

            // let container = this.$refs.codeContainer
            // editor.setSize(container.clientWidth, container.clientHeight);

            editor.on("dragover",this.dragOverOnCode);
            editor.on("drop",this.dropOnCode);

            var scroller = editor.getScrollerElement();
            scroller.addEventListener('mouseup', (e) => {
                var pos = editor.coordsChar({x: e.pageX, y: e.pageY});
                var token = editor.getTokenAt(pos);
                this.onEditorMouseUp(editor,e);
            });
        },
        onEditorFocus(editor) {
          console.log('the editor is focus!', editor)
        },
        onEditorCodeChange(newCode) {
          console.log('onEditorCodeChange')
          this.code = newCode
        },
        // addNewRule() {
        //     globalStore.ruleCounter++;
        //     var newRulePlaceholder = new RulePlaceholderModel(globalStore.ruleCounter)

        //     globalStore.rulesPlaceholders.push(newRulePlaceholder);

        //     globalStore.socket.emit('message-from-desktop', { type: "NEW_RULE", message: newRulePlaceholder.toJSON() })
        // }
    },
    computed: {
        // rulesPlaceholders: function() {
        //     return globalStore.rulesPlaceholders
        // }
        codeEditor() {
          return this.$refs.codeMirror.editor
        }
    },
    mounted: function() {

    }
}
</script>

<style>
.codeArea {
/*    width: 100%;
    background-color: #eeeeee;
    display: flex;
    flex-wrap: wrap;
    align-content:flex-start;*/
    /*width: 70%;*/
    padding-top: 10px;
    height: 400px;
}

</style>