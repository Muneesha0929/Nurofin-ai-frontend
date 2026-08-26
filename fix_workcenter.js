const fs = require('fs');

function fixFile(file, isWorkcenter) {
  let content = fs.readFileSync(file, 'utf-8');
  
  if (isWorkcenter) {
    content = content.replace(
      'await loadData();\n        }}',
      'await loadData();\n          if (selectedTask && selectedTask.id === completingTaskId) {\n            await handleSelectTask({ id: completingTaskId });\n          }\n        }}'
    );
  } else {
    // projects uses setProjects
    // wait, what is the method in projects to reload the selected task?
    // Let's check how projects handle selected task updates.
  }
  
  fs.writeFileSync(file, content, 'utf-8');
}

fixFile('app/workcenter/page.tsx', true);
