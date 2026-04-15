/**
 * Patches react-native .d.ts host components so `typeof View` etc. satisfy React's JSX
 * ElementType. Idempotent: safe to run on every postinstall.
 */
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '../node_modules/react-native/Libraries');

function patchIf(rel, fn) {
  const p = path.join(root, rel);
  if (!fs.existsSync(p)) {
    console.warn('skip (missing)', rel);
    return;
  }
  let s = fs.readFileSync(p, 'utf8');
  const norm = s.replace(/\r\n/g, '\n');
  const out = fn(norm);
  if (norm === out) return;
  fs.writeFileSync(p, out);
  console.log('patched', rel);
}

patchIf('Components/View/View.d.ts', (s) =>
  s
    .replace(
      "import {Constructor} from '../../../types/private/Utilities';\nimport {ViewProps} from './ViewPropTypes';\nimport {NativeMethods} from '../../../types/public/ReactNativeTypes';\n",
      "import {ViewProps} from './ViewPropTypes';\n",
    )
    .replace(
      /declare class ViewComponent extends React\.Component<ViewProps> \{\}\ndeclare const ViewBase: Constructor<NativeMethods> & typeof ViewComponent;\nexport class View extends ViewBase \{/,
      'declare class ViewComponent extends React.Component<ViewProps> {}\nexport class View extends ViewComponent {',
    ),
);

patchIf('Text/Text.d.ts', (s) =>
  s
    .replace(
      "import {Constructor} from '../../types/private/Utilities';\nimport {AccessibilityProps}",
      'import {AccessibilityProps}',
    )
    .replace("import {NativeMethods} from '../../types/public/ReactNativeTypes';\n", '')
    .replace(
      /declare class TextComponent extends React\.Component<TextProps> \{\}\ndeclare const TextBase: Constructor<NativeMethods> & typeof TextComponent;\nexport class Text extends TextBase \{\}/,
      'declare class TextComponent extends React.Component<TextProps> {}\nexport class Text extends TextComponent {}',
    ),
);

patchIf('Components/ActivityIndicator/ActivityIndicator.d.ts', (s) =>
  s
    .replace(
      "import {Constructor} from '../../../types/private/Utilities';\nimport {NativeMethods} from '../../../types/public/ReactNativeTypes';\n",
      '',
    )
    .replace(
      /declare class ActivityIndicatorComponent extends React\.Component<ActivityIndicatorProps> \{\}\ndeclare const ActivityIndicatorBase: Constructor<NativeMethods> &\n  typeof ActivityIndicatorComponent;\nexport class ActivityIndicator extends ActivityIndicatorBase \{\}/,
      'declare class ActivityIndicatorComponent extends React.Component<ActivityIndicatorProps> {}\nexport class ActivityIndicator extends ActivityIndicatorComponent {}',
    ),
);

patchIf('Components/ScrollView/ScrollView.d.ts', (s) =>
  s
    .replace("import {Constructor} from '../../../types/private/Utilities';\n", '')
    .replace(
      /declare class ScrollViewComponent extends React\.Component<ScrollViewProps> \{\}\nexport declare const ScrollViewBase: Constructor<ScrollResponderMixin> &\n  typeof ScrollViewComponent;\nexport class ScrollView extends ScrollViewBase \{/,
      'declare class ScrollViewComponent extends React.Component<ScrollViewProps> {}\nexport class ScrollView extends ScrollViewComponent {',
    ),
);

patchIf('Components/Keyboard/KeyboardAvoidingView.d.ts', (s) =>
  s
    .replace(
      "import {Constructor} from '../../../types/private/Utilities';\nimport {TimerMixin} from '../../../types/private/TimerMixin';\n",
      '',
    )
    .replace(
      /declare class KeyboardAvoidingViewComponent extends React\.Component<KeyboardAvoidingViewProps> \{\}\ndeclare const KeyboardAvoidingViewBase: Constructor<TimerMixin> &\n  typeof KeyboardAvoidingViewComponent;\nexport class KeyboardAvoidingView extends KeyboardAvoidingViewBase \{\}/,
      'declare class KeyboardAvoidingViewComponent extends React.Component<KeyboardAvoidingViewProps> {}\nexport class KeyboardAvoidingView extends KeyboardAvoidingViewComponent {}',
    ),
);

patchIf('Components/TextInput/TextInput.d.ts', (s) =>
  s
    .replace(
      "import {Constructor} from '../../../types/private/Utilities';\nimport {TimerMixin} from '../../../types/private/TimerMixin';\nimport {\n  HostInstance,\n  NativeMethods,\n} from '../../../types/public/ReactNativeTypes';\n",
      "import {\n  HostInstance,\n} from '../../../types/public/ReactNativeTypes';\n",
    )
    .replace(
      /declare class TextInputComponent extends React\.Component<TextInputProps> \{\}\ndeclare const TextInputBase: Constructor<NativeMethods> &\n  Constructor<TimerMixin> &\n  typeof TextInputComponent;\nexport class TextInput extends TextInputBase \{/,
      'declare class TextInputComponent extends React.Component<TextInputProps> {}\nexport class TextInput extends TextInputComponent {',
    ),
);
