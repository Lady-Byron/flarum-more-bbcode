import Component from 'flarum/common/Component';
import Button from 'flarum/common/components/Button';
import Tooltip from 'flarum/common/components/Tooltip';
import TagCollector, { Tags } from '../helper/tagCollector';
import { showIf } from '../utils/nodeUtil';
import classList from 'flarum/common/utils/classList';
import styleSelectedText from 'flarum/common/utils/styleSelectedText';
import align from '../utils/hAlignUtil';
import Mithril from 'mithril';

const heightPreRow = 36;

// 判断是否是真正的 <textarea>
function isTextareaLike(obj: any): obj is HTMLTextAreaElement {
  return (
    !!obj &&
    typeof obj.tagName === 'string' &&
    obj.tagName.toLowerCase() === 'textarea'
  );
}

/**
 * 统一的样式应用入口：
 * - Markdown：传进来的是 <textarea>，直接走 Flarum 核心的 styleSelectedText
 * - 富文本：传进来的是 ProseMirrorEditorDriver，使用它的 `el` shim
 * - 其它实现：只要长得像 textarea（value / selectionStart / selectionEnd 等）即可
 */
function applyStyleToEditor(editor: any, style: any) {
  if (!editor) return;

  // 如果传的是 ProseMirrorEditorDriver，就取它的 shim
  const target = editor.el ? editor.el : editor;

  // 原生 textarea：直接用核心工具
  if (isTextareaLike(target)) {
    styleSelectedText(target, style);
    return;
  }

  // shim / 其它 textarea-like：依然丢给 styleSelectedText
  styleSelectedText(target as any, style);
}

export default class buttonBar extends Component<{
  tagCollect: TagCollector;
  editor?: any;     // HTMLTextAreaElement | ProseMirrorEditorDriver
  textEditor?: any; // 兼容旧调用：内部会当成 editor 使用
  rows?: number;
  className?: string;
  bottom?: number;
}> {
  selectedSub: string = '';

  view() {
    const rows = this.attrs.rows || 1;
    const tags = this.attrs.tagCollect.get();
    const groups = tags.filter((tag) => tag.type === 'group');
    const offset = (this.attrs.bottom || 0) + 3;

    return (
      <div
        className={classList('ButtonBar', this.attrs.className)}
        style={`bottom:${offset}px;`}
      >
        {this.getTags(tags, rows)}
        {groups.map((group) =>
          buttonBar.component({
            editor: this.attrs.editor || this.attrs.textEditor,
            tagCollect: group.tags,
            className:
              'SubButtons' + showIf(this.selectedSub === group.name, ' show', ''),
            rows: group.rows,
            bottom: rows * heightPreRow,
          })
        )}
      </div>
    );
  }

  onupdate(vnode: any): void {
    super.onupdate(vnode);
    if (this.selectedSub) {
      const base = $(this.element).find('.Button.selected');
      const elem = $(this.element).children('.show');
      align(base, elem);
    }
  }

  getTags(tags: Tags[], rows: number) {
    const ret: (Mithril.ClassComponent | JSX.Element)[][] = [[]];
    const preRow = Math.floor((tags.length + rows - 1) / rows);
    let currentRow = 0;

    for (let i = 0; i < tags.length; i++) {
      ret[currentRow].push(this.getTagComponent(tags[i]));
      if ((i + 1) % preRow === 0) {
        currentRow++;
        ret.push([]);
      }
    }

    return ret.map((row) => <div className="ButtonBar-row">{row}</div>);
  }

  getTagComponent(tag: Tags) {
    if (tag.type === 'space') return <div className="ButtonBar-space"></div>;
    if (tag.type === 'collect') return tag.component;

    let clsName = 'Button Button--link';
    if (tag.type === 'group') clsName += ' GroupBtn';
    if (typeof tag.icon === 'string') clsName += ' Button--icon';
    if (tag.name === this.selectedSub) clsName += ' selected';

    if (!tag.icon) {
      return (
        <Button className={clsName} onclick={this.clickEventWarper(tag)}>
          {tag.tooltip}
        </Button>
      );
    } else if (typeof tag.icon === 'string') {
      return (
        <Tooltip text={tag.tooltip} position="bottom">
          <Button
            className={clsName}
            icon={tag.icon}
            onclick={this.clickEventWarper(tag)}
          />
        </Tooltip>
      );
    } else if (typeof tag.icon === 'function') {
      return (
        <Tooltip text={tag.tooltip} position="bottom">
          <Button className={clsName} onclick={this.clickEventWarper(tag)}>
            {tag.icon()}
          </Button>
        </Tooltip>
      );
    } else {
      return (
        <Tooltip text={tag.tooltip} position="bottom">
          <Button className={clsName} onclick={this.clickEventWarper(tag)}>
            {tag.icon.component.component(tag.icon.attrs)}
          </Button>
        </Tooltip>
      );
    }
  }

  clickEventWarper(tag: Tags) {
    return ((event: MouseEvent) => {
      (event.currentTarget as HTMLElement).blur();
      this.clickEvent(tag);
    }).bind(this);
  }

  clickEvent(tag: Tags) {
    if (tag.type === 'group') {
      this.selectedSub = tag.name;
      m.redraw();
      return;
    }
    if (tag.type !== 'button') return;

    const editor = this.attrs.editor || this.attrs.textEditor;
    if (!editor) return;

    if (typeof tag.style !== 'function') {
      applyStyleToEditor(editor, tag.style as any);
    } else {
      const data = tag.style();
      if (data instanceof Promise) {
        data.then(
          (style) => style && applyStyleToEditor(editor, style as any)
        );
      } else {
        data && applyStyleToEditor(editor, data as any);
      }
    }
  }
}
