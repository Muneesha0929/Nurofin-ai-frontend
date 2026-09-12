import re

with open('app/(dashboard)/targets/page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# For individual targets
target_completed_div = """{target.is_completed && target.completed_at && (
                          <span className="text-xs font-bold text-green-600 dark:text-green-400">
                            Completed: {new Date(target.completed_at).toLocaleDateString()}
                          </span>
                        )}"""
new_target_completed_div = """{target.is_completed && target.completed_at && (
                          <span className="text-xs font-bold text-green-600 dark:text-green-400">
                            Completed: {new Date(target.completed_at).toLocaleDateString()}
                          </span>
                        )}
                        {target.average_score != null && (
                          <span className="text-xs font-bold text-accent-blue bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded">
                            Avg Score: {target.average_score.toFixed(1)}
                          </span>
                        )}"""
content = content.replace(target_completed_div, new_target_completed_div)

# For global targets
global_completed_btn = """<button
                        onClick={() => handleToggleComplete(target)}"""
new_global_completed_btn = """{target.average_score != null && (
                        <span className="text-[10px] font-bold text-accent-blue bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded">
                          Score: {target.average_score.toFixed(1)}
                        </span>
                      )}
                      <button
                        onClick={() => handleToggleComplete(target)}"""
content = content.replace(global_completed_btn, new_global_completed_btn)

with open('app/(dashboard)/targets/page.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print("Patched targets page")
