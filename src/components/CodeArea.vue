<template>
    <div id="codeArea" class="codeArea">
      <!-- <editor v-model="content" @init="editorInit" lang="javascript" theme="chrome" width="50%" height="350"></editor> -->
      <codemirror ref="myEditor"
              :code="content"
              :options="editorOptions"
              @ready="onEditorReady"
              @focus="onEditorFocus"
              @change="onEditorCodeChange">
      </codemirror>
      <state-diagram :nodes="states" :links="edges" width="50%"></state-diagram>
    </div>
</template>

<script>
import Vue from 'vue'
import {extendArray} from '../collections.js'
extendArray(Array);
import {globalStore, globalBus, RulePlaceholderModel, State} from '../store.js'
import { codemirror, CodeMirror } from 'vue-codemirror'
import StateDiagram from './StateDiagram.vue'
import TextMark from './TextMark.vue'

export default {
    name: 'code-area',
    data: function() {
        return {
            editorOptions: {
                // codemirror options
                tabSize: 4,
                mode: 'text/javascript',
                theme: 'base16-dark',
                lineNumbers: true,
                line: true,
                // keyMap: "sublime",
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
        // editor:require('vue2-ace-editor'),
        codemirror: codemirror,
        StateDiagram
    },
    methods: {
        onEditorReady(editor) {
          console.log('the editor is ready!', editor)
          let from = {line:0,ch:0} //Inclusive
          let to = {line: 9, ch: 0} //Ch 0 means, that that line is not affected

          // <diff-element v-for="diff in diffArray" :diff-data="diff" :visual-state-model="visualStateModel"></diff-element>


            var markSpan = document.createElement('span')
            markSpan.className = "locura";
            markSpan.innerHTML = "CHAN";
              editor.doc.markText(from, to, {replacedWith: markSpan});

            // create component constructor
            const TextMarkConstructor = Vue.extend(TextMark);
            var child = new TextMarkConstructor({
                el: markSpan, // define the el of component
                parent: this, // define parent of component
            }).$mount();
            // debugger;
        },
        onEditorFocus(editor) {
          console.log('the editor is focus!', editor)
        },
        onEditorCodeChange(newCode) {
          console.log('this is new code', newCode)
          this.code = newCode
        },
        editorInit:function(editor) {
            // require('brace/mode/html');
            var browserifyAce = require('brace')

            require('brace/mode/javascript');
            // require('brace/mode/less');
            require('brace/theme/chrome');
            editor.getSession().setUseWrapMode(true);
                // debugger;

            var TokenIterator = browserifyAce.acequire("ace/token_iterator").TokenIterator

            // let tokenIterator = new TokenIterator(editor.getSession(),0,0)
            var acorn = require('acorn');

            var ast = acorn.parse(this.content, { ecmaVersion: 6 });

            // debugger;

            editor.on('mousemove',function(e){
                // for (var i = 0; i < 100; i++) {
                //     let result = tokenIterator.stepForward();
                //     console.log(result)
                //     debugger;
                // }
                var position = e.getDocumentPosition();
                var token = editor.session.getTokenAt(position.row, position.column);
                console.log(`${position.row} ${position.column} ${JSON.stringify(token)}`)
            })

            // editor.tokenTooltip = new TokenTooltip(editor);
        }
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
        editor() {
          return this.$refs.myEditor.editor
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
    display:flex;
}

.stateColumn {
    width: 200px;
}

.locura:hover {
    background-color: yellow;
}
</style>