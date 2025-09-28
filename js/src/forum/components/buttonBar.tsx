import Component from "flarum/common/Component";
import Button from "flarum/common/components/Button";
import Tooltip from "flarum/common/components/Tooltip";
import TagCollector, { TagButton, TagButtonGroup, Tags, TagSpace } from "../helper/tagCollector";
import { showIf } from "../utils/nodeUtil";
import classList from "flarum/common/utils/classList"
import styleSelectedText from "flarum/common/utils/styleSelectedText";
import align from "../utils/hAlignUtil";
import Mithril from "mithril";

// A Magic number that we use to calculate the height of sub buttons
const heightPreRow = 36;

export default class buttonBar extends Component<{
    tagCollect: TagCollector,
    textEditor: any, // EditorDriver | HTMLTextAreaElement
    rows?: number,
    className?: string,
    bottom?: number
}> {
    selectedSub: string = "";
    view(vnode: any) {
        const rows = this.attrs.rows || 1;
        const tags = this.attrs.tagCollect.get();
        const groups = tags.filter(tag => tag.type === "group");
        const offset = (this.attrs.bottom || 0) + 3;
        return <div
            className={classList("ButtonBar", this.attrs.className)}
            style={`bottom:${offset}px;`}>
            {this.getTags(tags, rows)}
            {groups.map(group => buttonBar.component({
                textEditor: this.attrs.textEditor,
                tagCollect: group.tags,
                className: "SubButtons" + showIf(this.selectedSub === group.name, " show", ""),
                rows: group.rows,
                bottom: rows * heightPreRow
            }))}
        </div>;
    }
    onupdate(vnode: any): void {
        super.onupdate(vnode);
        if (this.selectedSub) {
            const base = $(this.element).find(".Button.selected");
            const elem = $(this.element).children(".show");
            align(base, elem);
        }
    }
    getTags(tags: (Tags)[], rows: number) {
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
        return ret.map(row => <div class="ButtonBar-row">{row}</div>);
    }
    getTagComponent(tag: Tags) {
        if (tag.type === "space")
            return <div class="ButtonBar-space"></div>;
        if (tag.type === "collect")
            return tag.component;

        let clsName = "Button Button--link";
        if (tag.type === "group") clsName += " GroupBtn";
        if (typeof tag.icon === "string") clsName += " Button--icon";
        if (tag.name === this.selectedSub) clsName += " selected";


        if (!tag.icon) {
            return <Button className={clsName}
                onclick={this.clickEventWarper(tag)}>
                {tag.tooltip}
            </Button>
        } else if (typeof tag.icon === "string") {
            return <Tooltip text={tag.tooltip} position="bottom">
                <Button className={clsName}
                    icon={tag.icon}
                    onclick={this.clickEventWarper(tag)}></Button>
            </Tooltip>;
        } else if (typeof tag.icon === "function") {
            return <Tooltip text={tag.tooltip} position="bottom">
                <Button className={clsName} onclick={this.clickEventWarper(tag)}>
                    {tag.icon()}
                </Button>
            </Tooltip>;
        } else {
            return <Tooltip text={tag.tooltip} position="bottom">
                <Button className={clsName} onclick={this.clickEventWarper(tag)}>
                    {tag.icon.component.component(tag.icon.attrs)}
                </Button>
            </Tooltip>;
        }
    }
    clickEventWarper(tag: Tags) {
        return ((event: MouseEvent) => {
            (event.currentTarget as HTMLElement).blur();
            this.clickEvent(tag)
        }).bind(this);
    }
    clickEvent(tag: Tags) {
        if (tag.type === "group") {
            this.selectedSub = tag.name;
            m.redraw();
        } else if (tag.type === "button") {
            if (typeof tag.style !== "function")
                styleSelectedText(this.attrs.textEditor, tag.style as any)
            else {
                const data = tag.style();
                if (data instanceof Promise) {
                    data.then(style => style && styleSelectedText(this.attrs.textEditor, style as any));
                } else {
                    data && styleSelectedText(this.attrs.textEditor, data as any);
                }
            }
        }
    }
}
