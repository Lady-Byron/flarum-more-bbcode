import app from 'flarum/forum/app';
import styleSelectedText from 'flarum/common/utils/styleSelectedText';

export default function applyStyle(editor: any, style: any) {
  let ed: any = editor;

  // RTE 下 editor 没有 el，这里补齐为 .ProseMirror 节点
  if (!ed?.el) {
    const el =
      document.querySelector('.ComposerBody .ProseMirror') as HTMLElement ||
      document.querySelector('.RichTextEditor .ProseMirror') as HTMLElement ||
      null;
    if (el) ed = Object.assign({}, ed, { el });
  }

  try {
    styleSelectedText(ed, style);
  } catch (e) {
    // 兜底（极端情况下）：退化为直接插入 prefix+suffix，避免报错
    const prefix = style?.prefix ?? '';
    const suffix = style?.suffix ?? '';
    const text = `${prefix}${suffix}`;
    const drv: any = app.composer?.editor;
    if (drv?.replaceSelection) drv.replaceSelection(text);
    else if (drv?.insertAtCursor) drv.insertAtCursor(text);
  }
}
