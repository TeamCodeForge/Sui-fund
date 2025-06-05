import React, { ReactElement } from 'react';


const GroupDetailsMembers = (): ReactElement => {
  return (
    <div className="bg-white rounded-lg p-6 mb-4 shadow-sm border border-gray-200">
      <div className="h-8 w-64 bg-gray-200 rounded mb-6 animate-pulse"></div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="flex items-center p-4 rounded-lg bg-gray-100">
            <div className="w-16 h-16 bg-gray-200 rounded-full mr-4 animate-pulse"></div>
            <div className="flex-1">
              <div className="h-5 w-32 bg-gray-200 rounded mb-2 animate-pulse"></div>
              <div className="h-4 w-48 bg-gray-200 rounded animate-pulse"></div>
            </div>
          </div>
        ))}
      </div>
    </div>)
}

const GroupDetailsContributed = (): ReactElement => {
  return (<div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
    <div className="h-8 w-64 bg-gray-200 rounded mb-6 animate-pulse"></div>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="flex items-center p-4 rounded-lg bg-gray-100">
          <div className="w-16 h-16 bg-gray-200 rounded-full mr-4 animate-pulse"></div>
          <div className="flex-1">
            <div className="h-5 w-32 bg-gray-200 rounded mb-2 animate-pulse"></div>
            <div className="h-4 w-48 bg-gray-200 rounded animate-pulse"></div>
          </div>
        </div>
      ))}
    </div>
  </div>)
}

const GroupDetailsDashboard = (): ReactElement => {
  return (
    <div className="bg-white rounded-lg p-6 mb-6 shadow-sm border border-gray-200">
      <div className="flex items-center gap-2 mb-4">
        <div className="h-8 w-64 bg-gray-200 rounded animate-pulse"></div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
        {[...Array(8)].map((_, i) => (
          <div key={i}>
            <div className="h-4 w-24 bg-gray-200 rounded animate-pulse inline-block mr-2"></div>
            <div className="h-4 w-32 bg-gray-200 rounded animate-pulse inline-block"></div>
          </div>
        ))}
      </div>

      <div className="flex flex-col md:flex-row justify-between my-4 gap-4">
        <div className="h-12 w-48 bg-gray-200 rounded-xl animate-pulse"></div>
        <div className="h-12 w-48 bg-gray-200 rounded-xl animate-pulse"></div>
      </div>
    </div>

  )
}

const GroupDetailsSkeleton = (): ReactElement => {

  return (
    <div className="flex-1 flex flex-col">

      {/* Content Skeleton */}
      <div className="flex-1 p-8 bg-gray-50 overflow-y-auto">
        {/* Group Header Skeleton */}





      </div>
    </div>
  );
};

export default GroupDetailsSkeleton;
export {GroupDetailsContributed, GroupDetailsMembers, GroupDetailsDashboard}