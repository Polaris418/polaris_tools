# Email Components

This directory contains shared components for email management features in the Polaris Tools platform.

## Components

### 1. EmailStatusBadge

A unified status badge component that displays email statuses with appropriate icons and colors.

**Features:**
- Supports multiple status types (PENDING, PROCESSING, SENT, FAILED, RETRYING)
- Supports suppression reasons (HARD_BOUNCE, SOFT_BOUNCE, COMPLAINT)
- Consistent styling with icons and colors
- Dark mode support

**Usage:**
```tsx
import { EmailStatusBadge } from '@/components/email';

<EmailStatusBadge status="SENT" />
<EmailStatusBadge status="HARD_BOUNCE" type="suppression" />
```

**Requirements:** Task 12.3

---

### 2. EmailVerificationBanner

A banner component that displays at the top of pages when a user's email is not verified.

**Features:**
- Displays unverified email warning
- Resend verification email button with cooldown timer
- Dismissible
- Success/error message display
- Dark mode support

**Usage:**
```tsx
import { EmailVerificationBanner } from '@/components/email';

<EmailVerificationBanner
  email="user@example.com"
  onResendVerification={async () => {
    await api.resendVerification();
  }}
  cooldownSeconds={60}
/>
```

**Requirements:** Task 12.4, Requirement 18.8

---

### 3. EmailMetricsChart

A chart component for displaying email metrics and trends using Recharts.

**Features:**
- Supports line and bar chart types
- Configurable time ranges (24h, 7d, 30d, 90d)
- Multiple metrics display
- Custom tooltips
- Responsive design
- Dark mode support
- Empty state handling

**Usage:**
```tsx
import { EmailMetricsChart } from '@/components/email';

const data = [
  { timestamp: '2024-01-01', label: '1月1日', sent: 120, failed: 5 },
  { timestamp: '2024-01-02', label: '1月2日', sent: 150, failed: 3 },
];

const metrics = [
  { key: 'sent', name: '已发送', color: '#10b981' },
  { key: 'failed', name: '失败', color: '#ef4444' },
];

<EmailMetricsChart
  data={data}
  metrics={metrics}
  chartType="line"
  timeRange="7d"
  onTimeRangeChange={(range) => setTimeRange(range)}
  title="邮件发送趋势"
  height={300}
/>
```

**Requirements:** Task 12.2, Requirement 21.9

---

### 4. EmailTemplateEditor

A template editor component for editing email templates with HTML and plain text support.

**Features:**
- HTML and plain text editing tabs
- Live preview panel
- Variable insertion tool
- Basic HTML formatting toolbar (bold, italic, links, etc.)
- Variable reference display
- Read-only mode support
- Dark mode support

**Usage:**
```tsx
import { EmailTemplateEditor } from '@/components/email';

const [htmlContent, setHtmlContent] = useState('<p>Hello ${username}</p>');
const [textContent, setTextContent] = useState('Hello ${username}');

<EmailTemplateEditor
  htmlContent={htmlContent}
  textContent={textContent}
  variables={['username', 'email', 'verificationLink']}
  onHtmlChange={setHtmlContent}
  onTextChange={setTextContent}
  readOnly={false}
/>
```

**Requirements:** Task 12.1, Requirements 19.6, 19.8

---

## Implementation Notes

### EmailTemplateEditor

The EmailTemplateEditor uses a simplified textarea-based approach instead of a full rich text editor (like TinyMCE or Quill) due to React 19 compatibility issues with existing rich text editor libraries. This implementation provides:

- Basic HTML formatting toolbar
- Variable insertion functionality
- Live preview using `dangerouslySetInnerHTML`
- Full control over HTML content

For production use, consider:
- Adding syntax highlighting for HTML
- Implementing HTML validation
- Adding more formatting options
- Integrating a React 19-compatible rich text editor when available

### Dependencies

All components use:
- React 19
- Tailwind CSS for styling
- Material Symbols for icons
- Recharts for charts (EmailMetricsChart only)

### Styling

All components follow the project's design system:
- Consistent color palette
- Dark mode support
- Responsive design
- Accessible markup

## Testing

See `polaris-tools/examples/EmailComponents.example.tsx` for usage examples and visual testing.

## Future Enhancements

1. **EmailTemplateEditor**
   - Add syntax highlighting for HTML
   - Add HTML validation
   - Add more formatting options
   - Add image upload support

2. **EmailMetricsChart**
   - Add export to CSV/PNG functionality
   - Add more chart types (pie, area)
   - Add drill-down capabilities

3. **EmailVerificationBanner**
   - Add animation effects
   - Add customizable messages
   - Add multiple action buttons

4. **EmailStatusBadge**
   - Add tooltip with detailed information
   - Add click handlers for status details
   - Add animation for status changes
