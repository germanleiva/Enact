<template>
    <div id="codeArea" class="columns">
        <div class="column">
            <div class="columns">
                <div class="column" style="height:200px;overflow: auto">
                    <div v-for="aShape in stateMachine.shapes" class="button objectClass" @mouseover="aShape.highlight = true" @mouseout="aShape.highlight = false">{{aShape.id}}</div>
                    <br>
                    <div v-for="aTouch in stateMachine.touches" class="button objectClass">{{aTouch.id}}</div>
                    <br>
                    <div v-for="aMeasure in stateMachine.measures" class="button objectClass">{{aMeasure.id}}</div>
                </div>
                <div class="column" style="height:200px;overflow: auto">
                    <a class="button is-primary" style="width:100%">New Function</a>
                    <a v-for="aSMFunction in stateMachine.functions" class="button" style="width:100%" @click="selectedFunction = aSMFunction">{{aSMFunction.name}}</a>
                </div>
            </div>
            <div ref="codeContainer" style="background-color: yellow">
                <codemirror ref="codeMirror" v-if="selectedFunction != undefined"
                  :code="selectedFunction.stringCode"
                  :options="editorOptions"
                  @ready="onEditorReady"
                  @focus="onEditorFocus"
                  @change="onEditorCodeChange">
                </codemirror>
            </div>
        </div>
        <!-- <div class="columnVariables" style="background-color:green"></div> -->
        <div class="column" style="background-color:blue;">
            <state-diagram
                :nodes="stateMachine.states"
                :links="stateMachine.transitions"
                style="height:200px"
                @selectedNode="onSelectedState"
                @selectedLink="onSelectedEdge">
            </state-diagram>
            <div style="background-color:rgba(255,100,0,50)">
                <codemirror ref="transitionCodeMirror"
                  :code="''"
                  :options="editorOptions"
                  @ready="onEditorReady"
                  @focus="onEditorFocus"
                  @change="onTransitionEditorCodeChange">
                </codemirror>
            </div>
        </div>

    </div>
</template>

<script>
import Vue from 'vue'
import {extendArray} from '../collections.js'
extendArray(Array);
import {globalStore, globalBus, DiffModel, StateMachine} from '../store.js'
import { codemirror, CodeMirror } from 'vue-codemirror'
require('json-fn');

require('codemirror/addon/hint/show-hint.js')
require('codemirror/addon/hint/show-hint.css')
require('codemirror/addon/hint/javascript-hint.js')

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

let orig = CodeMirror.hint.javascript;
CodeMirror.hint.javascript = function(editor,options) {
    var inner = orig(editor,options) || {from: cm.getCursor(), to: cm.getCursor(), list: []};

// text: string
//      The completion text. This is the only required property.
// displayText: string
//      The text that should be displayed in the menu.
// className: string
//      A CSS class name to apply to the completion's line in the menu.
// render: fn(Element, self, data)
//      A method used to create the DOM structure for showing the completion by appending it to its first argument.
// hint: fn(CodeMirror, self, data)
//      A method used to actually apply the completion, instead of the default behavior.
// from: {line, ch}
//      Optional from position that will be used by pick() instead of the global one passed with the full list of completions.
// to: {line, ch}
//      Optional to position that will be used by pick() instead of the global one passed with the full list of completions.

    // for (let i of [1,2,3,4,5,6]) {
    //     inner.list.push({text:`this.shapes['S${i}']`,displayText:`$S${i}`})
    // }


    // inner.list.push("$S1");
    // inner.list.push("$S2");
    // inner.list.push("$S3");
    return inner;
}

globalStore.stateMachine = new StateMachine({isServer:true});

let idleState = globalStore.stateMachine.insertNewState({name:'Idle'});
let movingState = globalStore.stateMachine.insertNewState({name:'Moving'});
idleState.isSelected = true;
globalStore.stateMachine.insertNewTransition({name:'touchstart',source:idleState,target:movingState});
globalStore.stateMachine.insertNewTransition({name:'touchmove',source:movingState,target:movingState});
globalStore.stateMachine.insertNewTransition({name:'touchend',source:movingState,target:idleState});

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
                extraKeys: { "Ctrl-Space": "autocomplete" },
                foldGutter: true,
                gutters: ["CodeMirror-linenumbers", "CodeMirror-foldgutter"],
                styleSelectedText: true,
                highlightSelectionMatches: { showToken: /\w/, annotateScrollbar: true },
                // more codemirror config...
                hintOptions: {
                    globalScope: globalStore.stateMachine.globalScope
                }
            },
            selectedFunction: undefined
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
                    let newTextMarkerModel = editor.doc.markText(from, to, {replacedWith: markSpan});

                    // create component constructor
                    const TextMarkConstructor = Vue.extend(TextMark);
                    var child = new TextMarkConstructor({
                        el: markSpan, // define the el of component
                        parent: this, // define parent of component
                        propsData: {
                            textMarkerModel: newTextMarkerModel,
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
            // getLineTokens()

            var regexObjects = /\$(\w{2,})/g;
            var match;
            while (match = regexObjects.exec(newCode)) {
                let objectId = match[1];
                let characterInCode = match.index;
                // let foundShape = this.stateMachine.shapes.find((aShape) => aShape.id === id)
                // if (foundShape) {
                    console.log("WE SHOULD CREATE A TEXT MARKER?")
                // }
            }

            if (this.selectedFunction) {
                console.log("UPDATING CODE")
                this.selectedFunction.code = newCode
            }
        },
        onTransitionEditorCodeChange(newCode) {
            let currentlySelectedItem = this.currentlySelectedEdge || this.currentlySelectedState ||  undefined
            currentlySelectedItem.sourceCode = newCode
        },
        // addNewRule() {
        //     globalStore.ruleCounter++;
        //     var newRulePlaceholder = new RulePlaceholderModel(globalStore.ruleCounter)

        //     globalStore.rulesPlaceholders.push(newRulePlaceholder);

        //     globalStore.socket.emit('message-from-desktop', { type: "NEW_RULE", message: newRulePlaceholder.toJSON() })
        // }
        onSelectedState(aNode) {
            this.$refs.transitionCodeMirror.editor.setValue(aNode.sourceCode)
        },
        onSelectedEdge(aLink) {
            this.$refs.transitionCodeMirror.editor.setValue(aLink.sourceCode)

        }
    },
    computed: {
        // rulesPlaceholders: function() {
        //     return globalStore.rulesPlaceholders
        // }
        codeEditor() {
          return this.$refs.codeContainer.editor
        },
        currentlySelectedEdge() {
            return this.stateMachine.transitions.find(anEdge => anEdge.isSelected)
        },
        currentlySelectedState() {
            return this.stateMachine.states.find(aState => aState.isSelected)
        },
        stateMachine() {
            return globalStore.stateMachine;
        },
        codeForSelectedFunction() {
            debugger;
            return JSONfn(this.selectedFunction)
        }
    },
    mounted: function() {
        this.onSelectedState(this.currentlySelectedState)
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

.objectClass {
    min-width: 40px;
    text-align: center;
    margin-right: 2px;
    margin-bottom: 2px !important;
    padding: 4px !important;
}

</style>