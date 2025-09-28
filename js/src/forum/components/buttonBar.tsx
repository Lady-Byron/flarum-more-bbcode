import Component from "flarum/common/Component";
import Button from "flarum/common/components/Button";
import Tooltip from "flarum/common/components/Tooltip";
import TagCollector, { Tags } from "../helper/tagCollector";
import { showIf } from "../utils/nodeUtil";
import classList from "flarum/common/utils/classList";
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

  // —— 仅在本文件内的小工具：包裹/插入 —— //
  private applyStyleInline = (style: any) => {
    const ed: any = this.attrs.editor;
    const prefix = style?.prefix ?? "";
    const suffix = style?.suffix ?? "";

    // 优先走 EditorDriver（RTE 与纯文本都实现了这套接口）
    if (ed?.getSelectionRange && ed?.getValue && ed?.replaceSelection) {
      const { start, end } = ed.getSelectionRange();
      const value: string = ed.getValue();
      const selected = value.slice(start, end);
      const text = prefix + selected + suffix;

      ed.replaceSelection(text);
      ed.focus?.();

      // 如果没有选中文本且存在 suffix，把光标移到两端标记中间
      if (!selected && suffix) {
        const pos = start + prefix.length;
        ed.setSelectionRange?.(pos, pos);
      }
      return;
    }

    // 兜底：直接操作 textarea（纯文本旧环境）
    const ta = document.querySelector<HTMLTextAreaElement>('.ComposerBody textarea');
    if (ta) {
      const s = ta.selectionStart ?? ta.value.length;
      const e = ta.selectionEnd ?? ta.value.length;
      const selected = ta.value.slice(s, e);
      const text = prefix + selected + suffix;
      ta.setRangeText(text, s, e, 'end');
      ta.dispatchEvent(new Event('input', { bubbles: true }));
      ta.focus();
      if (!selected && suffix) {
        const pos = s + prefix.length;
        ta.setSelectionRange(pos, pos);
      }
    }
  };

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

    if (typeof tag.style !== "function") {
      this.applyStyleInline(tag.style as any);
    } else {
      const data = tag.style();
      if (data instanceof Promise) {
        data.then((style) => style && this.applyStyleInline(style as any));
      } else {
        data && this.applyStyleInline(data as any);
      }
    }
  }
}
