import NavigationDropdown from "@/components/navigation-dropdown";

interface PageHeaderProps {
  title?: string;
  description?: string;
  activeSection?: string;
  onSectionChange?: (section: string) => void;
  children?: React.ReactNode;
}

export default function PageHeader({ 
  title, 
  description, 
  activeSection, 
  onSectionChange,
  children 
}: PageHeaderProps) {
  return (
    <div className="bg-white border-b border-gray-200 sticky top-0 z-40">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Left side - Navigation Dropdown */}
          <div className="flex items-center gap-4">
            <NavigationDropdown 
              activeSection={activeSection}
              onSectionChange={onSectionChange}
            />
            
            {/* Page Title and Description */}
            {title && (
              <div className="hidden sm:block">
                <h1 className="text-xl font-semibold text-gray-900">{title}</h1>
                {description && (
                  <p className="text-sm text-gray-500 mt-1">{description}</p>
                )}
              </div>
            )}
          </div>

          {/* Right side - Additional actions */}
          <div className="flex items-center gap-2">
            {children}
          </div>
        </div>

        {/* Mobile title - shown below navigation on small screens */}
        {title && (
          <div className="sm:hidden pb-4">
            <h1 className="text-lg font-semibold text-gray-900">{title}</h1>
            {description && (
              <p className="text-sm text-gray-500 mt-1">{description}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}