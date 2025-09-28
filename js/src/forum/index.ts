import app from 'flarum/common/app';
import { extend } from 'flarum/common/extend';
import TextEditor from 'flarum/common/components/TextEditor';
import buttonBar from './components/buttonBar';
import TagCollector, { TagButtonGroup, Tags } from './helper/tagCollector';
import addTypographyButtons from './tags/typography';
import addUtilitiesTags from './tags/utilities';
import TextEditorButton from 'flarum/common/components/TextEditorButton';
import { prioritySerial, showIf } from './utils/nodeUtil';
import addEmbedTags from './tags/embed';
import { addXX2SeeTags } from './tags/xx2see';
import align from './utils/hAlignUtil';
import regSetting from './settings';
import { autoClose, collectAll, collectMarkdown, removeMd } from './utils/preferenceUtil';

app.initializers.add('xypp/more-bbcode', () => {
  const tags = new TagCollector();
  const priority = prioritySerial(100, 100);
  addTypographyButtons(tags, priority);
  addUtilitiesTags(tags, priority);
  addEmbedTags(tags, priority);
  addXX2SeeTags(tags, priority);

  let hasAddCollectBtn = false;
  let showMoreBBcodeButtons = false;

  extend(buttonBar.prototype, 'clickEvent', function (this: buttonBar, _val: any, tag: Tags) {
    if (tag.type === 'group') return;
    if (autoClose()) {
      showMoreBBcodeButtons = false;
      m.redraw();
    }
  });

  extend(TextEditor.prototype, 'toolbarItems', function (this: TextEditor, items) {
    const collect_all = collectAll();
    const remove_markdown = removeMd();
    const collect_markdown = collectMarkdown();

    if (collect_all || (collect_markdown !== 'none' && remove_markdown)) {
      if (!hasAddCollectBtn) {
        tags.group(0, 'collect', 'fas fa-box-open', 'xypp-more-bbcode.forum.collect', () => {});
        hasAddCollectBtn = true;
      }
    } else if (hasAddCollectBtn) {
      tags.remove('collect');
      hasAddCollectBtn = false;
    }

    let minPriority = 0;
    if (collect_all) {
      const collect = tags.item('collect') as TagButtonGroup;
      collect.tags.clear();
      Object.keys(items.toObject()).forEach(function (key) {
        if (key === 'markdown') return;
        const p = items.getPriority(key);
        const item = items.get(key);
        items.remove(key);
        collect.tags.collect(0 - p, key, item);
        minPriority = Math.min(minPriority, 0 - p);
      });
    }

    if (remove_markdown && items.has('markdown')) {
      (tags.item('collect') as TagButtonGroup).tags.remove('markdown');
      if (collect_markdown === 'first') {
        (tags.item('collect') as TagButtonGroup).tags.collect(minPriority - 1, 'markdown', items.get('markdown'));
      } else if (collect_markdown === 'sub') {
        (tags.item('collect') as TagButtonGroup).tags.group(
          minPriority - 1,
          'markdown',
          'fab fa-markdown',
          'xypp-more-bbcode.forum.markdown',
          (g_tags) => {
            g_tags.collect(0, 'markdown', items.get('markdown'));
          }
        );
      }
      items.remove('markdown');
    }

    items.add(
      'xypp-more-bbcode',
      TextEditorButton.component(
        {
          className: 'bbcode-more-btn Button Button--icon Button--link',
          position: 'bottom',
          onclick: (e: any) => {
            e.currentTarget.blur();
            showMoreBBcodeButtons = !showMoreBBcodeButtons;
            m.redraw();
          },
          icon: showIf(showMoreBBcodeButtons, 'fa fa-minus', 'fa fa-plus'),
        },
        app.translator.trans('xypp-more-bbcode.forum.name')
      )
    );

    // 关键：RTE 下依赖 editor.el（上面的兼容层）
    const driver = (this.attrs as any)?.composer?.editor;
    if (showMoreBBcodeButtons && driver?.el) {
      items.add(
        'xypp-more-bbcode-buttons',
        buttonBar.component({
          tagCollect: tags,
          className: 'main-entry',
          textEditor: driver.el, // 传 textarea 兼容层
          bottom: 57,
        }),
        -50000
      );
    }
  });

  extend(TextEditor.prototype, ['onupdate', 'oncreate'], function (this: TextEditor) {
    if (!showMoreBBcodeButtons) return;
    const btn = this.$('.bbcode-more-btn');
    const elem = this.$('.main-entry');
    align(btn, elem);
  });

  regSetting();
}, -50000);
