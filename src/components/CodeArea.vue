<template>
    <div id="codeArea" class="columns">
        <div class="column is-2" >
            <aside class="menu">
                <p class="menu-label">Functions</p>
                <ul class="menu-list" style="height:475px;overflow:scroll">
                    <li v-for="aSMFunction in stateMachine.functions" :class="{'is-active': aSMFunction.isSelected}"><a @click="toggleFunction(aSMFunction)">{{aSMFunction.name}}</a></li>
                </ul>
            </aside>
            <a class="button" @click="createNewFunction()">New</a>
            <a class="button" @click="">Delete</a>
        </div>
        <div class="column is-4">
            <div style="background-color: yellow">
                <codemirror ref="codeContainer" v-if="selectedFunction != undefined"
                  :code="selectedFunction.code"
                  :options="editorOptions"
                  @ready="onEditorReady"
                  @focus="onEditorFocus"
                  @change="onEditorCodeChange">
                </codemirror>
            </div>
        </div>
        <div class="column">
            <state-diagram
                :nodes="stateMachine.states"
                :links="stateMachine.transitions"
                style="height:250px"
                @selectedNode="onSelectedState"
                @selectedLink="onSelectedEdge"
                @diagramNewNode="addNewState"
                @diagramNewLink="addNewTransition">
            </state-diagram>
            <div style="background-color:rgba(255,100,0,50)">
                <codemirror ref="transitionCodeMirror"
                  :code="''"
                  :options="transitionEditorOptions"
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
    var result = orig(editor,options)// || {from: cm.getCursor(), to: cm.getCursor(), list: []};

    if (result) {
        CodeMirror.on(result, "select", function(textSelected,textDOM) {
            if (textSelected == "position") {

                let cur = editor.getCursor()
                cur.ch -= 1
                let token = editor.getTokenAt(cur)

                var tprop = token;
                var context = [tprop];
                // If it is a property, find out what it is a property of.
                while (tprop.type == "property") {
                  tprop = editor.getTokenAt(CodeMirror.Pos(cur.line, tprop.start));
                  if (tprop.string != ".") return;
                  tprop = editor.getTokenAt(CodeMirror.Pos(cur.line, tprop.start));
                  context.push(tprop);
                }
                let path = context.reduce((acum,each) => acum + each.string+".", "")
                                                debugger;

            }
        });
    }

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
    return result;
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
                extraKeys: { "Ctrl-Space": "autocomplete"},
                foldGutter: true,
                gutters: ["CodeMirror-linenumbers", "CodeMirror-foldgutter"],
                styleSelectedText: true,
                highlightSelectionMatches: { showToken: /\w/, annotateScrollbar: true },
                // more codemirror config...
                hintOptions: {
                    globalScope: {$:globalStore.stateMachine.globalScope},
                }
            },
            transitionEditorOptions: {
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
                    globalScope: {$:globalStore.stateMachine.globalScope},
                }
            },
            textMarkers: [],
        }
    },
    components: {
        codemirror: codemirror,
        StateDiagram
    },
    methods: {
        deleteAllTextMarkers() {
            for (let eachTextMarker of Array.from(this.textMarkers)) {
                eachTextMarker.$el.remove()
                eachTextMarker.$destroy()
            }
        },
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

                let codeToInsert
                if (event.shiftKey) {
                    codeToInsert = `$.${visualState.name}.${object.name}`
                } else {
                    codeToInsert = `$.${object.name}`
                }

                editor.doc.replaceSelection(codeToInsert)

                // let newContextMenu = new ContextMenu()
                // newContextMenu.startingX = event.pageX;
                // newContextMenu.startingY = event.pageY;
                // newContextMenu.$mount()
                // window.document.body.appendChild(newContextMenu.$el)

                // newContextMenu.onSelectedProperty = (propertyName,axis) => {
                //     console.log("SELECTED PROPERTY: " + propertyName)
                //     // editor.focus()
                //     // editor.doc.setCursor(newCoordinates)
                //     editor.doc.replaceSelection(`{${propertyName}:${JSON.stringify(object[propertyName])}}`)

                //     let from = newCoordinates
                //     let to = editor.doc.getCursor("to")

                //     var markSpan = document.createElement('span')
                //     // markSpan.className = "locura";
                //     // markSpan.innerHTML = "CHAN";
                //     let newTextMarkerModel = editor.doc.markText(from, to, {replacedWith: markSpan});

                //     // create component constructor
                //     const TextMarkConstructor = Vue.extend(TextMark);
                //     var child = new TextMarkConstructor({
                //         el: markSpan, // define the el of component
                //         parent: this, // define parent of component
                //         propsData: {
                //             textMarkerModel: newTextMarkerModel,
                //             visualState: visualState,
                //             object: object,
                //             propertyName: propertyName
                //         }
                //     }).$mount();

                //     // this.content = editor.getValue()
                //     // debugger;
                // }
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

          editor.on("select",function(x,y){
            debugger;
          })

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
          if (editor == this.$refs.transitionCodeMirror.editor) {
            let currentlySelectedItem = this.currentlySelectedEdge || this.currentlySelectedState ||  undefined
            if (currentlySelectedItem) {
                // editor.options.hintOptions.globalScope = {"this":{arriba:'up',pepe:3}}
            }
          }
        },
        onEditorCodeChange(newCode) {
            this.deleteAllTextMarkers();

            let allVSNames = globalStore.visualStates.map((vs) => vs.name).join("|")
            let allObjects = "S1|S2|S3|F0|F1|F2|D1|D2"
            let allProperties = "position|size|color|force|angularRotation"
            let allExtraProperties = "x|y|width|height"
            const validExtraProperties = {'position':['x','y'],'size':['width','height']}

            var regex = new RegExp(`\\$(?:\\.(${allVSNames}))?(?:\\.(${allObjects}))(?:\\.(${allProperties}))?(?:\\.(${allExtraProperties}))?`, "g");

            var match;

            let linesOfCode = newCode.split('\n');
            for (let lineNumber=0;lineNumber<linesOfCode.length;lineNumber++) {
                let code = linesOfCode[lineNumber];

                while (match = regex.exec(code)) {
                    let visualStateId = match[1];
                    let objectId = match[2];
                    let propertyName = match[3];
                    let extraPropertyName = match[4];

                    if (!objectId || (!propertyName && extraPropertyName) || (extraPropertyName && validExtraProperties[propertyName].indexOf(extraPropertyName) < 0)) {
                        debugger;
                        continue;
                    }
                    let matchStartingCh = match.index;
                    // let foundShape = this.stateMachine.shapes.find((aShape) => aShape.id === id)
                    // if (foundShape) {
                        let from = {line:lineNumber,ch:matchStartingCh}
                        let to = {line:lineNumber,ch:matchStartingCh + match[0].length}

                        var markSpan = document.createElement('span')
                        // markSpan.className = "locura";
                        // markSpan.innerHTML = "CHAN";
                        let newTextMarkerModel = this.codeEditor.doc.markText(from, to, {replacedWith: markSpan,atomic:false});

                        // create component constructor
                        const TextMarkConstructor = Vue.extend(TextMark);
                        var textMarkComponent = new TextMarkConstructor({
                            el: markSpan, // define the el of component
                            parent: this, // define parent of component
                            propsData: {
                                textMarkerModel: newTextMarkerModel,
                                visualStateId: visualStateId,
                                objectId: objectId,
                                propertyName: propertyName,
                                extraPropertyName: extraPropertyName
                            }
                        }).$mount();
                    // }
                    this.textMarkers.push(textMarkComponent)
                }
            }

            if (this.selectedFunction) {
                this.selectedFunction.code = newCode
            }
        },
        onTransitionEditorCodeChange(newCode) {
            let currentlySelectedItem = this.currentlySelectedEdge || this.currentlySelectedState ||  undefined
            currentlySelectedItem.sourceCode = newCode
        },
        onSelectedState(aNode) {
            this.$refs.transitionCodeMirror.editor.setValue(aNode.sourceCode)
        },
        onSelectedEdge(aLink) {
            this.$refs.transitionCodeMirror.editor.setValue(aLink.sourceCode)

        },
        createNewFunction(){
            let newFunction = this.stateMachine.addNewFunction("unnamed")
            this.toggleFunction(newFunction)
        },
        toggleFunction(aSMFunction) {
            for (let eachFunction of this.stateMachine.functions) {
                eachFunction.isSelected = eachFunction == aSMFunction
            }
        },
        addNewState() {
            this.stateMachine.insertNewState({name:'New State'});
        },
        addNewTransition({source,target}) {
            this.stateMachine.insertNewTransition({name:'unnamed',source:source,target:target});
        }

    },
    computed: {
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
        selectedFunction() {
            return this.stateMachine.functions.find((f) => f.isSelected)
        }
    },
    mounted: function() {
        this.onSelectedState(this.currentlySelectedState)
    }
}
</script>

<style>
/*.CodeMirror {
    height: 100% !important;
}*/
.codeArea {
/*    width: 100%;
    background-color: #eeeeee;
    display: flex;
    flex-wrap: wrap;
    align-content:flex-start;*/
    /*width: 70%;*/
    padding-top: 10px;
    height: 550px;
}

</style>