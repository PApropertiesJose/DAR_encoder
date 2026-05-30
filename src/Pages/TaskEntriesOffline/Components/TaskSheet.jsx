import { memo } from 'react';
import { Container, Paper, Table } from '@mantine/core';

const thStyle = { textAlign: 'center' };
const BG = '#00595c';

const TaskSheet = memo(() => {
  return (
    <Container component={Paper} fluid p={0} m={0}>
      {/* This div is the ONLY scroll container — give it a fixed height */}
      <div style={{ overflowX: 'auto', overflowY: 'auto', height: `calc(100vh - 360px)`, position: 'relative' }}>
        <Table
          withRowBorders
          withTableBorder
          withColumnBorders
          style={{
            fontSize: 11,
            borderCollapse: 'separate',
            borderSpacing: 0,
          }}
        >
          <Table.Thead>
            <Table.Tr bg={BG}>
              <Table.Th rowSpan={2} style={{ ...thStyle, position: 'sticky', top: 0, left: 0, background: BG, zIndex: 5 }}>NO</Table.Th>
              <Table.Th rowSpan={2} style={{ ...thStyle, minWidth: 100, position: 'sticky', top: 0, left: 40, background: BG, zIndex: 5 }}>SKILLS</Table.Th>
              <Table.Th rowSpan={2} style={{ ...thStyle, minWidth: 200, position: 'sticky', top: 0, left: 0, background: BG, zIndex: 5 }}>NAME</Table.Th>
              {Array(8).fill().map((_, i) => (
                <Table.Th key={i} colSpan={4} style={{ ...thStyle, position: 'sticky', top: 0, background: BG, zIndex: 3 }}>
                  Planned Activity {i + 1}
                </Table.Th>
              ))}
            </Table.Tr>
            <Table.Tr bg={BG}>
              {Array(8).fill().map((_, i) => (
                <>
                  <Table.Th key={`ti-${i}`} style={{ ...thStyle, position: 'sticky', top: 30.5, background: BG, zIndex: 3 }}>TimeIn</Table.Th>
                  <Table.Th key={`to-${i}`} style={{ ...thStyle, position: 'sticky', top: 30.5, background: BG, zIndex: 3 }}>TimeOut</Table.Th>
                  <Table.Th key={`ac-${i}`} style={{ ...thStyle, position: 'sticky', top: 30.5, background: BG, zIndex: 3 }}>Activity</Table.Th>
                  <Table.Th key={`ju-${i}`} style={{ ...thStyle, position: 'sticky', top: 30.5, background: BG, zIndex: 3 }}>Justification</Table.Th>
                </>
              ))}
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {Array(40).fill().map((_, rowIdx) => (
              <Table.Tr key={rowIdx}>
                <Table.Td style={{ position: 'sticky', left: 0, background: 'white', zIndex: 1 }}>{rowIdx + 1}</Table.Td>
                <Table.Td style={{ position: 'sticky', left: 0, background: 'white', zIndex: 2 }}>HELPER</Table.Td>
                <Table.Td style={{ position: 'sticky', left: 0, minWidth: 200, background: 'white', zIndex: 3 }}>DELA CRUZ, JOSE PAULO</Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </div>
    </Container>
  );
});

export default TaskSheet;
