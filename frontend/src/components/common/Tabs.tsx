type TabItem = {
  key: string;
  label: string;
};

type TabsProps = {
  items: TabItem[];
  activeKey: string;
  onChange: (key: string) => void;
};

export function Tabs({ items, activeKey, onChange }: TabsProps) {
  return (
    <div className="tempo-tabs" role="tablist" aria-label="Tempo navigation tabs">
      {items.map((item) => (
        <button
          key={item.key}
          type="button"
          className={item.key === activeKey ? 'tempo-tab is-active' : 'tempo-tab'}
          onClick={() => onChange(item.key)}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}
