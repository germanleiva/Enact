<template>
    <div id="codeArea" class="columns">
        <div class="column is-6">
            <div style="background-color: yellow">
                <codemirror ref="codeContainer" v-if="selectedElement != undefined"
                  :code="selectedElement.code"
                  :options="editorOptions"
                  @ready="onEditorReady"
                  @focus="onEditorFocus"
                  @change="onEditorCodeChange">
                </codemirror>
            </div>
        </div>
        <div class="column is-2" >
            <aside class="menu">
                <p class="menu-label">Functions</p>
                <ul class="menu-list" style="height:240px;overflow:scroll">
                    <li v-for="aSMFunction in stateMachine.functions" :class="{'is-active': aSMFunction.isSelected}"><a @click="toggleFunction(aSMFunction)">{{aSMFunction.name}}</a></li>
                </ul>
            </aside>
            <a class="button" @click="createNewFunction()">New</a>
            <a class="button" @click="">Delete</a>
        </div>
        <div class="column">
            <state-diagram
                :nodes="stateMachine.states"
                :links="stateMachine.transitions"
                @selectedNode="onSelectedState"
                @selectedLink="onSelectedEdge"
                @diagramNewNode="addNewState"
                @diagramNewLink="addNewTransition">
            </state-diagram>
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


globalStore.stateMachine = new StateMachine({isServer:true});

let idleState = globalStore.stateMachine.insertNewState({name:'Idle'});
let movingState = globalStore.stateMachine.insertNewState({name:'Moving'});
idleState.isSelected = true;
globalStore.stateMachine.insertNewTransition({name:'touchstart',source:idleState,target:movingState});
globalStore.stateMachine.insertNewTransition({name:'touchmove',source:movingState,target:movingState});
globalStore.stateMachine.insertNewTransition({name:'touchend',source:movingState,target:idleState});


let orig = CodeMirror.hint.javascript;
CodeMirror.hint.javascript = function(editor,options) {
    var result = orig(editor,options)// || {from: cm.getCursor(), to: cm.getCursor(), list: []};

    if (result) {
        CodeMirror.on(result, "select", function(textSelected,textDOM) {
            // if (textSelected == "position") {

            //     let cur = editor.getCursor()
            //     cur.ch -= 1
            //     let token = editor.getTokenAt(cur)

            //     var tprop = token;
            //     var context = [tprop];
            //     // If it is a property, find out what it is a property of.
            //     while (tprop.type == "property") {
            //       tprop = editor.getTokenAt(CodeMirror.Pos(cur.line, tprop.start));
            //       if (tprop.string != ".") return;
            //       tprop = editor.getTokenAt(CodeMirror.Pos(cur.line, tprop.start));
            //       context.push(tprop);
            //     }
            //     let path = context.reduce((acum,each) => acum + each.string+".", "")
            //                                     debugger;

            // }
        });
        CodeMirror.on(result, "pick", function(textSelected){

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
    for (let i=0; i < result.list.length; i++) {
        let currentText = result.list[i]
        let stateMachineFunction = globalStore.stateMachine.functions.find((f) => f.name == currentText)
        if (stateMachineFunction) {
            let match = /function\s(\w+)\(\s*(\{[\s\S]*\})\s*\)/.exec(stateMachineFunction.code)
            if (match) {
                let functionName = match[1]
                let jsonParameter = match[2].replace(/\n/g, "");

                //ASSERT
                if (functionName != currentText) {
                    abort("THIS SHOULDNT HAPPEN")
                }

               jsonParameter = jsonParameter.replace(/{|}|\n|\s*/g,'')
                                            .split(',')
                                            .reduce(function(acum,each,index,list,z){
                                                let cleanedArgName = each
                                                let defaultValueStart = cleanedArgName.indexOf(':')
                                                if (defaultValueStart < 0) {
                                                    defaultValueStart = cleanedArgName.indexOf('=')
                                                }
                                                if (defaultValueStart >= 0) {
                                                    cleanedArgName = cleanedArgName.substr(0,defaultValueStart)
                                                }
                                                let suffix = ':'
                                                if (index < list.length - 1) {
                                                    suffix = ':,'
                                                }
                                                return acum + cleanedArgName + suffix
                                            },'')

               result.list[i] = {text:`${functionName}({${jsonParameter}})`,displayText:currentText}
            }
        }
    }

    return result;
}

export default {
    name: 'code-area',
    data: function() {
        return {
            editorOptions: {
                // codemirror options
                tabSize: 4,
                mode: 'text/javascript',
                //theme: 'default',
                lineNumbers: true,
                line: true,
                // keyMap: "sublime",
                lineWrapping: true,
                extraKeys: {
                    "Ctrl-Space": "autocomplete",
                    // "'.'": function(cm) {
                    //    setTimeout(function(){cm.execCommand("autocomplete");}, 50);
                    //    throw CodeMirror.Pass; // tell CodeMirror we didn't handle the key
                    // }
                },
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
                console.log(globalStore.currentLink)
                let object = globalStore.currentLink.object
                let visualState = globalStore.currentLink.visualState

                let newCoordinates = this.setEditorCursorAt(editor,event)

                let codeToInsert
                if (event.shiftKey) {
                    codeToInsert = `$.${visualState.name}.${object.id}`
                } else {
                    codeToInsert = `$.${object.id}`
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
          // if (editor == this.$refs.transitionCodeMirror.editor) {
            let currentlySelectedItem = this.currentlySelectedEdge || this.currentlySelectedState ||  undefined
            if (currentlySelectedItem) {
                // editor.options.hintOptions.globalScope = {"this":{arriba:'up',pepe:3}}
            }
          // }
        },
        onEditorCodeChange(newCode) {
            // let currentlySelectedItem = this.currentlySelectedEdge || this.currentlySelectedState ||  undefined
            // currentlySelectedItem.code = newCode

            this.deleteAllTextMarkers();

            let {objects,allVS,allObjects,allProperties} = this.parsingData
            var regex = new RegExp(`\\$(?:\\.(${allVS}))?(?:\\.(${allObjects}))(?:\\.(${allProperties}))?(?:\\.(\\w+))?`, "g");

            var match;

            let linesOfCode = newCode.split('\n');
            for (let lineNumber=0;lineNumber<linesOfCode.length;lineNumber++) {
                let code = linesOfCode[lineNumber];

                while (match = regex.exec(code)) {
                    let visualStateId = match[1];
                    let objectId = match[2];
                    let propertyName = match[3];
                    let extraPropertyName = match[4];

                    let matchStartingCh = match.index;
                    let from = {line:lineNumber,ch:matchStartingCh}
                    let to = {line:lineNumber,ch:matchStartingCh + match[0].length}

                    if (!objectId) {
                        //It was not a valid objectId
                        continue;
                    }

                    if (propertyName) {
                        let validExtraProperties = objects[objectId].propertyMap[propertyName]

                        if (!validExtraProperties) {
                            //It was not a valid propertyName
                            continue;
                        }
                        if (extraPropertyName && validExtraProperties.indexOf(extraPropertyName) < 0) {
                            //It was not a valid extraPropertyName
                            continue;
                        }
                    } else {
                        if (extraPropertyName) {
                            //I shouldn't count the extraProperty if I don't have a property
                            to.ch -= extraPropertyName.length + 1 //We need to count the .
                        }
                    }

                    const TextMarkVM = Vue.extend(TextMark);
                    var newTextMarkVM = new TextMarkVM({
                        propsData: {
                            visualStateId: visualStateId,
                            objectId: objectId,
                            propertyName: propertyName,
                            extraPropertyName: extraPropertyName
                        }
                    }).$mount();

                    window.document.body.appendChild(newTextMarkVM.$el);

                    let textMarker = this.codeEditor.doc.markText(from, to, {insertLeft:true,replacedWith: newTextMarkVM.$el});

                    newTextMarkVM.textMarkerModel = textMarker

                    this.textMarkers.push(newTextMarkVM)
                }
            }

            if (this.selectedElement) {
                this.selectedElement.code = newCode
            }
        },
        onSelectedState(aNode) {
            this.unselectAllFunctions()
            this.codeEditor.focus()
            // this.codeEditor.setValue(aNode.code)
        },
        onSelectedEdge(aLink) {
            this.unselectAllFunctions()
            this.codeEditor.focus()
            // this.codeEditor.setValue(aLink.code)
        },
        createNewFunction(){
            let newFunction = this.stateMachine.addNewFunction("unnamed")
            this.toggleFunction(newFunction)
        },
        unselectAllFunctions(){
            this.toggleFunction(undefined)
        },
        toggleFunction(aSMFunction) {
            for (let eachFunction of this.stateMachine.functions) {
                eachFunction.isSelected = eachFunction == aSMFunction
                if (eachFunction.isSelected) {
                    this.codeEditor.focus()
                    this.unselectStateMachine()
                }
            }
        },
        unselectStateMachine(){
            let unselect = (x) => x.isSelected = false
            this.stateMachine.states.forEach(unselect)
            this.stateMachine.transitions.forEach(unselect)
        },
        addNewState() {
            this.stateMachine.insertNewState({name:'New State'});
        },
        addNewTransition({source,target}) {
            this.stateMachine.insertNewTransition({name:'unnamed',source:source,target:target});
        }

    },
    computed: {
        parsingData() {
            let objects = {}
            let allVSNames = []
            let allObjectNames = []
            let allPropertyNames = []
            for (let eachVS of globalStore.visualStates) {
                allVSNames.push(eachVS.name)

                for (let eachObject of eachVS.allObjects) {
                    objects[eachObject.id] = eachObject.constructor
                    for (let eachPropertyName of eachObject.constructor.allProperties) {
                        if (allPropertyNames.indexOf(eachPropertyName) < 0) {
                            allPropertyNames.push(eachPropertyName)
                        }
                    }
                    if (allObjectNames.indexOf(eachObject.id) < 0) {
                        allObjectNames.push(eachObject.id)
                    }
                }
            }

            let allVS = allVSNames.join("|")
            let allObjects = allObjectNames.join("|")
            let allProperties = allPropertyNames.join("|")
            return {objects,allVS,allObjects,allProperties}
        },
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
        selectedElement() {
            return this.stateMachine.selectedElement
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
#codeArea {
/*    width: 100%;
    background-color: #eeeeee;
    display: flex;
    flex-wrap: wrap;
    align-content:flex-start;*/
    /*width: 70%;*/
    background-color: #ffffff;
    padding-left: 3px;
    padding-right: 3px;
    /*height: 550px;*/
}

</style>