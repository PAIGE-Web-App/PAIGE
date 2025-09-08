import React from 'react';

export default function TableComparison() {
  return (
    <div className="bg-white rounded-[5px] border border-[#AB9C95] p-6">
      <h2 className="text-lg font-playfair font-semibold text-[#332B42] mb-4">
        Implementation Comparison
      </h2>
      
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-[#F8F6F4]">
              <th className="p-3 text-left border-r border-[#E0DBD7]">Feature</th>
              <th className="p-3 text-left border-r border-[#E0DBD7]">Current Implementation</th>
              <th className="p-3 text-left">TanStack Table</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-[#E0DBD7]">
              <td className="p-3 border-r border-[#E0DBD7] font-medium">Column Resizing</td>
              <td className="p-3 border-r border-[#E0DBD7]">✅ Custom mouse events</td>
              <td className="p-3">✅ Built-in with hooks</td>
            </tr>
            <tr className="border-b border-[#E0DBD7] bg-[#FAF9F8]">
              <td className="p-3 border-r border-[#E0DBD7] font-medium">Sorting</td>
              <td className="p-3 border-r border-[#E0DBD7]">❌ Not implemented</td>
              <td className="p-3">✅ Built-in sorting</td>
            </tr>
            <tr className="border-b border-[#E0DBD7]">
              <td className="p-3 border-r border-[#E0DBD7] font-medium">Filtering</td>
              <td className="p-3 border-r border-[#E0DBD7]">❌ Not implemented</td>
              <td className="p-3">✅ Built-in filtering</td>
            </tr>
            <tr className="border-b border-[#E0DBD7] bg-[#FAF9F8]">
              <td className="p-3 border-r border-[#E0DBD7] font-medium">Row Selection</td>
              <td className="p-3 border-r border-[#E0DBD7]">❌ Not implemented</td>
              <td className="p-3">✅ Built-in selection</td>
            </tr>
            <tr className="border-b border-[#E0DBD7]">
              <td className="p-3 border-r border-[#E0DBD7] font-medium">Column Reordering</td>
              <td className="p-3 border-r border-[#E0DBD7]">✅ Custom drag & drop</td>
              <td className="p-3">✅ Built-in reordering</td>
            </tr>
            <tr className="border-b border-[#E0DBD7] bg-[#FAF9F8]">
              <td className="p-3 border-r border-[#E0DBD7] font-medium">Frozen Columns</td>
              <td className="p-3 border-r border-[#E0DBD7]">✅ CSS sticky positioning</td>
              <td className="p-3">✅ Built-in pinning (left + right)</td>
            </tr>
            <tr className="border-b border-[#E0DBD7] bg-[#FAF9F8]">
              <td className="p-3 border-r border-[#E0DBD7] font-medium">Inline Editing</td>
              <td className="p-3 border-r border-[#E0DBD7]">✅ Custom implementation</td>
              <td className="p-3">✅ Flexible cell editors</td>
            </tr>
            <tr className="border-b border-[#E0DBD7]">
              <td className="p-3 border-r border-[#E0DBD7] font-medium">Virtualization</td>
              <td className="p-3 border-r border-[#E0DBD7]">❌ Not implemented</td>
              <td className="p-3">✅ Built-in virtualization</td>
            </tr>
            <tr className="border-b border-[#E0DBD7] bg-[#FAF9F8]">
              <td className="p-3 border-r border-[#E0DBD7] font-medium">Accessibility</td>
              <td className="p-3 border-r border-[#E0DBD7]">⚠️ Basic support</td>
              <td className="p-3">✅ Full ARIA support</td>
            </tr>
            <tr className="border-b border-[#E0DBD7]">
              <td className="p-3 border-r border-[#E0DBD7] font-medium">Bundle Size</td>
              <td className="p-3 border-r border-[#E0DBD7]">✅ Minimal (custom code)</td>
              <td className="p-3">⚠️ ~100KB (with features)</td>
            </tr>
            <tr className="border-b border-[#E0DBD7] bg-[#FAF9F8]">
              <td className="p-3 border-r border-[#E0DBD7] font-medium">Maintenance</td>
              <td className="p-3 border-r border-[#E0DBD7]">⚠️ High (custom code)</td>
              <td className="p-3">✅ Low (well-maintained library)</td>
            </tr>
            <tr className="border-b border-[#E0DBD7]">
              <td className="p-3 border-r border-[#E0DBD7] font-medium">TypeScript</td>
              <td className="p-3 border-r border-[#E0DBD7]">✅ Good</td>
              <td className="p-3">✅ Excellent</td>
            </tr>
            <tr className="bg-[#FAF9F8]">
              <td className="p-3 border-r border-[#E0DBD7] font-medium">Customization</td>
              <td className="p-3 border-r border-[#E0DBD7]">✅ Complete control</td>
              <td className="p-3">✅ Headless (full control)</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
