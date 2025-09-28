import Component from "flarum/common/Component";
import Button from "flarum/common/components/Button";
import Tooltip from "flarum/common/components/Tooltip";
import TagCollector, { Tags } from "../helper/tagCollector";
import { showIf } from "../utils/nodeUtil";
import classList from "flarum/common/utils/classList";
import styleSelectedText from "flarum/common/utils/styleSelectedText";
import align from "../utils/hAlignUtil";
import Mithril from "mithril";

// 每行按钮高度（用于子按钮定位）
const heightPreRow = 36;

export default class buttonBar extends Component<{
  tagCollect: TagCollector;
  editor: any;            // Flarum EditorDriver（RTE/纯文本均可）
  rows?: number;
  className?: string;
  bottom?: number;
}> {
  selectedSub: string = "";

  view() {
    const rows = this.attrs.rows || 1;
    const tags = this.attrs.tagCollect.get();
    const groups = tags.filter((tag) => tag.type === "group");
    const offset = (this.attrs.bottom || 0) + 3;

    return (
      <div className={classList("ButtonBar", this.attrs.className)} style={`bottom:${offset}px;`}>
        {this.getTags(tags, rows)}
        {groups.map((group) =>
          buttonBar.component({
            editor: this.attrs.editor,
            tagCollect: group.tags,
            className: "SubButtons" + showIf(this.selectedSub === group.name, " show", ""),
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
      const base = $(this.element).find(".Button.selected");
      const elem = $(this.element).children(".show");
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
    if (tag.type === "space") return <div className="ButtonBar-space"></div>;
    if (tag.type === "collect") return tag.component;

    let clsName = "Button Button--link";
    if (tag.type === "group") clsName += " GroupBtn";
    if (typeof tag.icon === "string") clsName += " Button--icon";
    if (tag.name === this.selectedSub) clsName += " selected";

    if (!tag.icon) {
      return (
        <Button className={clsName} onclick={this.clickEventWarper(tag)}>
          {tag.tooltip}
        </Button>
      );
    } else if (typeof tag.icon === "string") {
      return (
        <Tooltip text={tag.tooltip} position="bottom">
          <Button className={clsName} icon={tag.icon} onclick={this.clickEventWarper(tag)} />
        </Tooltip>
      );
    } else if (typeof tag.icon === "function") {
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
    if (tag.type === "group") {
      this.selectedSub = tag.name;
      m.redraw();
      return;
    }
    if (tag.type !== "button") return;

    // —— 兼容层：确保传给 styleSelectedText 的对象有 .el —— //
    const compatEditor = (() => {
      const ed: any = this.attrs.editor;
      if (ed?.el) return ed; // 纯文本编辑器：el 就是 <textarea>
      const el =
        (document.querySelector('.ComposerBody .ProseMirror') as HTMLElement) ||
        (document.querySelector('.RichTextEditor .ProseMirror') as HTMLElement) ||
        null;
      return el ? Object.assign({}, ed, { el }) : ed;
    })();

    if (typeof tag.style !== "function") {
      styleSelectedText(compatEditor, tag.style as any);
    } else {
      const data = tag.style();
      if (data instanceof Promise) {
        data.then((style) => style && styleSelectedText(compatEditor, style as any));
      } else {
        data && styleSelectedText(compatEditor, data as any);
      }
    }
  }
}

