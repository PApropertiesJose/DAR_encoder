import moment from "moment";
import { useEffect } from "react";
import { useLocation } from "react-router";

export const ScrollToTop = ({ scrollRef }) => {
  const { pathname } = useLocation();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [pathname, scrollRef]);

  return null;
}

export const parseUserAgent = (userAgentString) => {
  // Extract browser name and version
  let browser = "Unknown";
  const chromeMatch = userAgentString.match(/Chrome\/(\d+\.\d+\.\d+\.\d+)/);
  const firefoxMatch = userAgentString.match(/Firefox\/(\d+\.\d+)/);
  const safariMatch = userAgentString.match(/Version\/(\d+\.\d+\.\d+).*Safari/);
  const edgeMatch = userAgentString.match(/Edg\/(\d+\.\d+\.\d+\.\d+)/);

  if (chromeMatch && !edgeMatch) {
    browser = `Chrome ${chromeMatch[1]}`;
  } else if (firefoxMatch) {
    browser = `Firefox ${firefoxMatch[1]}`;
  } else if (safariMatch) {
    browser = `Safari ${safariMatch[1]}`;
  } else if (edgeMatch) {
    browser = `Edge ${edgeMatch[1]}`;
  }

  // Extract operating system
  let os = "Unknown";
  if (userAgentString.includes("Windows NT 10.0")) {
    os = "Windows 10";
  } else if (userAgentString.includes("Windows NT 6.3")) {
    os = "Windows 8.1";
  } else if (userAgentString.includes("Windows NT 6.1")) {
    os = "Windows 7";
  } else if (userAgentString.includes("Mac OS X")) {
    const macMatch = userAgentString.match(/Mac OS X (\d+_\d+_\d+)/);
    if (macMatch) {
      os = `macOS ${macMatch[1].replace(/_/g, '.')}`;
    } else {
      os = "macOS";
    }
  } else if (userAgentString.includes("Linux")) {
    os = "Linux";
  }

  // Create simplified user agent (remove browser-specific parts)
  const simplifiedUA = userAgentString.split(') ')[0] + ')';

  return {
    "Browser": browser,
    "Operating System": os,
    "User Agent": simplifiedUA
  };
}

export function formatNumber(num) {
  return num.toLocaleString('en-US');
}

export const shortHandName = (name) => {
  if (!name) return "";

  const perName = name.trim().split(" ");
  const first = perName[0]?.charAt(0).toUpperCase() || "";
  const second = perName[0]?.charAt(1).toUpperCase() || "";
  return first + second;
}

export const normalizeWKT = (geom) =>
  geom.replace("COMPOUNDCURVE", "LINESTRING");

export function getInitials(user) {
  return user?.name
    ? user.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : 'AD'
}


export const computeHoursPerActivity = ({
  timeIn,
  timeOut,
  projectedHours,
}) => {
  if(projectedHours) return projectedHours || 0;
  if (!timeIn || !timeOut) return 0;

  const start = new Date(timeIn);
  const end = new Date(timeOut);

  // Helper to construct break boundaries on the same day as 'start'
  const getBreakTime = (date, hours, minutes) => {
    const breakTime = new Date(date);
    breakTime.setHours(hours, minutes, 0, 0);
    return breakTime;
  };

  const amBreakStart = getBreakTime(start, 10, 0); // 10:00 AM
  const amBreakEnd = getBreakTime(start, 10, 15);  // 10:15 AM

  const lunchBreakStart = getBreakTime(start, 12, 0); // 12:00 PM
  const lunchBreakEnd = getBreakTime(start, 13, 0);   // 1:00 PM

  const pmBreakStart = getBreakTime(start, 16, 0); // 4:00 PM
  const pmBreakEnd = getBreakTime(start, 16, 15);  // 4:15 PM

  let deduction = 0;

  // If time range is partially or fully within 10:00 AM - 10:15 AM
  if (start < amBreakEnd && end > amBreakStart) {
    deduction += 0.25;
  }

  // If time range is partially or fully within 12:00 PM - 1:00 PM
  if (start < lunchBreakEnd && end > lunchBreakStart) {
    deduction += 1;
  }

  // If time range is partially or fully within 4:00 PM - 4:15 PM
  if (start < pmBreakEnd && end > pmBreakStart) {
    deduction += 0.25;
  }

  const diffMs = end - start; // difference in milliseconds
  let diffHours = diffMs / (1000 * 60 * 60);

  diffHours -= deduction;

  return diffHours.toFixed(2);
}

export const realTimeTrackingOfOverlapHours = (timeIn, timeOut, allTasks) => {
  const startA = moment(timeIn);
  const endA = moment(timeOut);

  return allTasks.some((task) => {
    if (!task.dateTimeIn || !task.dateTimeOut) return false;

    const startB = moment(task.dateTimeIn);
    const endB = moment(task.dateTimeOut);

    if (!startB.isValid() || !endB.isValid()) return false;

    return startA.isBefore(endB) && startB.isBefore(endA);
  });
  // const startA = new Date(timeIn);
  // const endA = new Date(timeOut);
  //
  //
  // return allTasks.some((task) => {
  //   console.log(startA, task.dateTimeIn.replace("T", ' '), 'initial value');
  //   const startB = new Date(task.dateTimeIn); // "2026-04-10T07:00:00"
  //   const endB = new Date(task.dateTimeOut); // "2026-04-10T10:00:00"
  //
  //   console.log(startB, 'final value');
  //
  //
  //   return startA < endB && startB < endA;
  // });
}

export const isTaskOverlapping = (allTasks, currentIndex) => {
  const currentTask = allTasks[currentIndex];

  if (!currentTask || !currentTask.dateTimeIn || !currentTask.dateTimeOut) return false;


  const startA = new Date(currentTask.dateTimeIn);
  const endA = new Date(currentTask.dateTimeOut);

  return allTasks.some((task, index) => {
    if (
      index === currentIndex ||
      !task.dateTimeIn ||
      !task.dateTimeOut
    ) return false;

    const startB = new Date(task.dateTimeIn);
    const endB = new Date(task.dateTimeOut);

    return startA < endB && startB < endA;
  });
};
// export const isTaskOverlapping = (allTasks, currentIndex) => {
//   const currentTask = allTasks[currentIndex];
//   if (!currentTask || !currentTask.timeIn || !currentTask.timeOut) return false;
//
//   const startA = new Date(currentTask.timeIn);
//   const endA = new Date(currentTask.timeOut);
//   console.log(allTasks);
//
//   return allTasks.some((task, index) => {
//     if (index === currentIndex || !task.timeIn || !task.timeOut) return false;
//
//     const startB = new Date(task.timeIn);
//     const endB = new Date(task.timeOut);
//
//     return startA < endB && startB < endA;
//   });
// };
