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
  timeOut
}) => {
  if (!timeIn || !timeOut) return 0;

  const start = new Date(timeIn);
  const end = new Date(timeOut);

  const diffMs = end - start; // difference in milliseconds
  const diffHours = diffMs / (1000 * 60 * 60);

  return diffHours.toFixed(2);
}

export const isTaskOverlapping = (allTasks, currentIndex) => {
  const currentTask = allTasks[currentIndex];
  if (!currentTask || !currentTask.timeIn || !currentTask.timeOut) return false;

  const startA = new Date(currentTask.timeIn);
  const endA = new Date(currentTask.timeOut);

  return allTasks.some((task, index) => {
    if (index === currentIndex || !task.timeIn || !task.timeOut) return false;

    const startB = new Date(task.timeIn);
    const endB = new Date(task.timeOut);

    return startA < endB && startB < endA;
  });
};
